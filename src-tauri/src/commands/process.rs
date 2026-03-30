use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

pub struct HarvestProcess(pub Mutex<Option<Child>>);

#[derive(Serialize, Clone)]
struct LogEvent {
    line: String,
    stream: String,
    timestamp: String,
}

fn now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Simple ISO-ish timestamp without chrono dependency
    format!("{}", now)
}

#[derive(Deserialize)]
pub struct HarvestFlags {
    pub once: Option<bool>,
    pub use_aria2: Option<bool>,
    pub parallel: Option<u32>,
    pub include: Option<String>,
    pub exclude: Option<String>,
    pub verbose: Option<bool>,
}

#[tauri::command]
pub fn start_harvest(
    app: AppHandle,
    flags: HarvestFlags,
) -> Result<String, String> {
    let state = app.state::<HarvestProcess>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Check if already running
    if let Some(ref mut child) = *guard {
        match child.try_wait() {
            Ok(Some(_)) => {} // Process exited, allow restart
            Ok(None) => return Err("Harvest is already running".to_string()),
            Err(_) => {}
        }
    }

    let mut cmd = Command::new("uv");
    cmd.arg("run").arg("python").arg("-m").arg("harvest");

    if flags.once.unwrap_or(false) {
        cmd.arg("--once");
    }
    if flags.use_aria2.unwrap_or(false) {
        cmd.arg("--use-aria2");
    }
    if let Some(p) = flags.parallel {
        cmd.arg("--parallel").arg(p.to_string());
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

    // Inherit CANOPY_* env vars
    for (key, val) in std::env::vars() {
        if key.starts_with("CANOPY_") {
            cmd.env(&key, &val);
        }
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn harvest: {}", e))?;

    // Stream stdout
    let stdout = child.stdout.take();
    let app_stdout = app.clone();
    if let Some(stdout) = stdout {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_stdout.emit(
                        "harvest-log",
                        LogEvent {
                            line,
                            stream: "stdout".to_string(),
                            timestamp: now_iso(),
                        },
                    );
                }
            }
        });
    }

    // Stream stderr
    let stderr = child.stderr.take();
    let app_stderr = app.clone();
    if let Some(stderr) = stderr {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_stderr.emit(
                        "harvest-log",
                        LogEvent {
                            line,
                            stream: "stderr".to_string(),
                            timestamp: now_iso(),
                        },
                    );
                }
            }
        });
    }

    *guard = Some(child);
    Ok("Harvest started".to_string())
}

#[tauri::command]
pub fn stop_harvest(app: AppHandle) -> Result<String, String> {
    let state = app.state::<HarvestProcess>();
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    match guard.take() {
        Some(mut child) => {
            child.kill().map_err(|e| format!("Failed to kill harvest: {}", e))?;
            let _ = child.wait();
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
        Some(ref mut child) => match child.try_wait() {
            Ok(Some(_)) => {
                *guard = None;
                false
            }
            Ok(None) => true,
            Err(_) => {
                *guard = None;
                false
            }
        },
        None => false,
    };

    Ok(ProcessStatus { running })
}
