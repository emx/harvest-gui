use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread::JoinHandle;
use tauri::{AppHandle, Emitter, Manager};

pub(crate) struct ProcessHandle {
    child: Child,
    reader_threads: Vec<JoinHandle<()>>,
}

pub struct HarvestProcess(pub Mutex<Option<ProcessHandle>>);

#[derive(Serialize, Clone)]
struct LogEvent {
    line: String,
    stream: String,
    timestamp: String,
}

fn now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Manual UTC ISO 8601 formatting without chrono
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Calculate year/month/day from days since epoch (1970-01-01)
    let mut y = 1970i64;
    let mut remaining = days_since_epoch as i64;
    loop {
        let days_in_year = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
            366
        } else {
            365
        };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let month_days: [i64; 12] = [
        31,
        if leap { 29 } else { 28 },
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ];
    let mut m = 0usize;
    for (i, &md) in month_days.iter().enumerate() {
        if remaining < md {
            m = i;
            break;
        }
        remaining -= md;
    }
    let d = remaining + 1;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m + 1,
        d,
        hours,
        minutes,
        seconds
    )
}

#[derive(Deserialize)]
pub struct HarvestFlags {
    pub once: Option<bool>,
    pub include: Option<String>,
    pub exclude: Option<String>,
    pub verbose: Option<bool>,
}

fn cleanup_old_process(handle: &mut Option<ProcessHandle>) {
    if let Some(mut old) = handle.take() {
        let _ = old.child.wait();
        for t in old.reader_threads.drain(..) {
            let _ = t.join();
        }
    }
}

#[tauri::command]
pub fn start_harvest(
    app: AppHandle,
    flags: HarvestFlags,
) -> Result<String, String> {
    let state = app.state::<HarvestProcess>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Check if already running
    if let Some(ref mut handle) = *guard {
        match handle.child.try_wait() {
            Ok(Some(_)) => {
                // CR-04: Properly reap old process before spawning new
                cleanup_old_process(&mut *guard);
            }
            Ok(None) => return Err("Harvest is already running".to_string()),
            Err(_) => {
                cleanup_old_process(&mut *guard);
            }
        }
    }

    let mut cmd = Command::new("uv");
    cmd.arg("run").arg("python").arg("-m").arg("harvest");

    if flags.once.unwrap_or(false) {
        cmd.arg("--once");
    }
    if let Some(ref inc) = flags.include {
        cmd.arg("--include").arg(inc);
    }
    if let Some(ref exc) = flags.exclude {
        cmd.arg("--exclude").arg(exc);
    }
    if flags.verbose.unwrap_or(false) {
        cmd.arg("--verbose");
    }

    // CR-02: No need to explicitly set CANOPY_* env vars — Command inherits parent env

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn harvest: {}", e))?;

    let mut reader_threads = Vec::new();

    // Stream stdout
    if let Some(stdout) = child.stdout.take() {
        let app_handle = app.clone();
        let t = std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let _ = app_handle.emit(
                            "harvest-log",
                            LogEvent {
                                line,
                                stream: "stdout".to_string(),
                                timestamp: now_iso(),
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
        reader_threads.push(t);
    }

    // Stream stderr
    if let Some(stderr) = child.stderr.take() {
        let app_handle = app.clone();
        let t = std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let _ = app_handle.emit(
                            "harvest-log",
                            LogEvent {
                                line,
                                stream: "stderr".to_string(),
                                timestamp: now_iso(),
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
        reader_threads.push(t);
    }

    *guard = Some(ProcessHandle {
        child,
        reader_threads,
    });
    Ok("Harvest started".to_string())
}

#[tauri::command]
pub fn stop_harvest(app: AppHandle) -> Result<String, String> {
    let state = app.state::<HarvestProcess>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    match guard.take() {
        Some(mut handle) => {
            handle
                .child
                .kill()
                .map_err(|e| format!("Failed to kill harvest: {}", e))?;
            let _ = handle.child.wait();
            // CR-01: Wait for reader threads to finish after killing
            for t in handle.reader_threads {
                let _ = t.join();
            }
            Ok("Harvest stopped".to_string())
        }
        None => Err("No harvest process is running".to_string()),
    }
}

#[derive(Serialize)]
pub struct ProcessStatus {
    pub running: bool,
}

#[tauri::command]
pub fn harvest_status(app: AppHandle) -> Result<ProcessStatus, String> {
    let state = app.state::<HarvestProcess>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let running = match *guard {
        Some(ref mut handle) => match handle.child.try_wait() {
            Ok(Some(_)) => {
                cleanup_old_process(&mut *guard);
                false
            }
            Ok(None) => true,
            Err(_) => {
                cleanup_old_process(&mut *guard);
                false
            }
        },
        None => false,
    };

    Ok(ProcessStatus { running })
}
