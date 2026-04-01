pub mod config;
pub mod process;

use log::{error, info, warn};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::process::Command;

use tauri::{AppHandle, Manager};

/// Resolve the bundled Python path, or None if not bundled (dev mode fallback)
pub fn bundled_python(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let python = if cfg!(windows) {
        resource_dir.join("resources/harvest-venv/Scripts/python.exe")
    } else {
        resource_dir.join("resources/harvest-venv/bin/python")
    };
    if python.exists() {
        info!("bundled Python found at {}", python.display());
        Some(python)
    } else {
        // Dev mode: check src-tauri/resources directly
        let dev_python = if cfg!(windows) {
            PathBuf::from("resources/harvest-venv/Scripts/python.exe")
        } else {
            PathBuf::from("resources/harvest-venv/bin/python")
        };
        if dev_python.exists() {
            info!("dev-mode Python found at {}", dev_python.display());
            Some(dev_python)
        } else {
            info!("no bundled Python found, will use uv fallback");
            None
        }
    }
}

/// Resolve the bundled aria2c path
pub fn bundled_aria2c(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let aria2c = if cfg!(windows) {
        resource_dir.join("resources/bin/aria2c.exe")
    } else {
        resource_dir.join("resources/bin/aria2c")
    };
    if aria2c.exists() {
        info!("bundled aria2c found at {}", aria2c.display());
        Some(aria2c)
    } else {
        let dev_aria2c = if cfg!(windows) {
            PathBuf::from("resources/bin/aria2c.exe")
        } else {
            PathBuf::from("resources/bin/aria2c")
        };
        if dev_aria2c.exists() {
            info!("dev-mode aria2c found at {}", dev_aria2c.display());
            Some(dev_aria2c)
        } else {
            info!("no bundled aria2c found");
            None
        }
    }
}

fn canopy_dir(app: &AppHandle) -> Result<PathBuf, String> {
    // Read from saved config first, fall back to env var
    if let Ok(cfg) = config::load_config(app.clone()) {
        if !cfg.canopy_local_dir.is_empty() {
            return Ok(PathBuf::from(cfg.canopy_local_dir));
        }
    }
    match env::var("CANOPY_LOCAL_DIR") {
        Ok(val) => Ok(PathBuf::from(val)),
        Err(_) => {
            error!("CANOPY_LOCAL_DIR is not configured");
            Err("CANOPY_LOCAL_DIR is not configured. Set it in Settings.".to_string())
        }
    }
}

#[tauri::command]
pub fn get_processed(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let path = canopy_dir(&app)?.join(".harvest/processed_collects.json");
    let data = match fs::read_to_string(&path) {
        Ok(d) => d,
        Err(e) => {
            warn!("processed_collects.json not found: {}", e);
            return Err(format!("Failed to read {}: {}", path.display(), e));
        }
    };
    serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[tauri::command]
pub fn get_last_poll(app: AppHandle) -> Result<Value, String> {
    let path = canopy_dir(&app)?.join(".harvest/last_poll.json");
    let data = match fs::read_to_string(&path) {
        Ok(d) => d,
        Err(e) => {
            warn!("last_poll.json not found: {}", e);
            return Err(format!("Failed to read {}: {}", path.display(), e));
        }
    };
    serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[derive(Serialize)]
pub struct CollectEntry {
    pub collect_id: String,
    pub files: Vec<FileEntry>,
}

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub size: u64,
}

#[tauri::command]
pub fn list_collect_files(app: AppHandle) -> Result<Vec<CollectEntry>, String> {
    let collects_dir = canopy_dir(&app)?.join("collects");
    let entries = fs::read_dir(&collects_dir)
        .map_err(|e| format!("Failed to read {}: {}", collects_dir.display(), e))?;

    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let collect_id = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let mut files = Vec::new();
        let sub_entries = fs::read_dir(&path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
        for sub in sub_entries {
            let sub = sub.map_err(|e| format!("Failed to read file entry: {}", e))?;
            let meta = sub
                .metadata()
                .map_err(|e| format!("Failed to read metadata: {}", e))?;
            if meta.is_file() {
                files.push(FileEntry {
                    name: sub.file_name().to_string_lossy().to_string(),
                    size: meta.len(),
                });
            }
        }
        result.push(CollectEntry { collect_id, files });
    }
    Ok(result)
}


#[tauri::command]
pub fn tail_log(app: AppHandle, lines: Option<usize>) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(50);
    let path = canopy_dir(&app)?.join("harvest.log");
    let mut file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;

    let file_len = file
        .metadata()
        .map_err(|e| format!("Failed to read metadata: {}", e))?
        .len();

    if file_len == 0 {
        return Ok(Vec::new());
    }

    // Read a chunk from the end — 512 bytes per line is generous
    let chunk_size = std::cmp::min(file_len, (n as u64) * 512);
    let start_pos = file_len - chunk_size;
    file.seek(SeekFrom::Start(start_pos))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    let mut buf = String::new();
    if file.read_to_string(&mut buf).is_err() {
        // Chunk may have landed mid-UTF-8 character — fall back to full read
        buf.clear();
        file.seek(SeekFrom::Start(0))
            .map_err(|e| format!("Failed to seek: {}", e))?;
        file.read_to_string(&mut buf)
            .map_err(|e| format!("Failed to read log: {}", e))?;
    }

    let all_lines: Vec<&str> = buf.lines().collect();
    let skip = all_lines.len().saturating_sub(n);
    Ok(all_lines[skip..].iter().map(|s| s.to_string()).collect())
}

#[tauri::command]
pub fn list_assets(app: AppHandle) -> Result<Vec<String>, String> {
    info!("list_assets called");
    let mut cmd = if let Some(python) = bundled_python(&app) {
        let python_home = app
            .path()
            .resource_dir()
            .map(|d| d.join("resources/python"))
            .unwrap_or_default();
        let mut c = Command::new(python);
        c.env("PYTHONHOME", &python_home);
        c.args(["-m", "harvest", "--assets"]);
        c
    } else {
        let mut c = Command::new("uv");
        c.args(["run", "python", "-m", "harvest", "--assets"]);
        c
    };

    // Inject resolved config values as env vars (config file overrides env vars)
    let env_vars = config::get_resolved_env(app.clone())
        .map_err(|e| format!("Failed to load configuration: {}. Check Settings.", e))?;
    for (key, val) in &env_vars {
        cmd.env(key, val);
    }

    // Set HARVEST_ARIA2C_PATH if bundled aria2c is available
    if let Some(aria2c) = bundled_aria2c(&app) {
        cmd.env("HARVEST_ARIA2C_PATH", aria2c);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run harvest --assets: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("list_assets failed: {}", stderr.trim());
        return Err(format!("harvest --assets failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let assets: Vec<String> = stdout.lines().map(|s| s.to_string()).collect();
    info!("list_assets returned {} assets", assets.len());
    Ok(assets)
}

#[derive(Serialize)]
pub struct DiskUsage {
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
}

#[cfg(unix)]
#[tauri::command]
pub fn get_disk_usage(app: AppHandle) -> Result<DiskUsage, String> {
    use std::os::unix::ffi::OsStrExt;
    let dir = canopy_dir(&app)?;
    let bytes = dir.as_os_str().as_bytes();
    let path_cstr = std::ffi::CString::new(bytes)
        .map_err(|_| "CANOPY_LOCAL_DIR contains a null byte".to_string())?;
    unsafe {
        let mut stat: libc::statvfs = std::mem::zeroed();
        if libc::statvfs(path_cstr.as_ptr(), &mut stat) != 0 {
            return Err(format!("Failed to get disk usage for {}", dir.display()));
        }
        let total = stat.f_blocks as u64 * stat.f_frsize as u64;
        let available = stat.f_bavail as u64 * stat.f_frsize as u64;
        let used = total.saturating_sub(stat.f_bfree as u64 * stat.f_frsize as u64);
        Ok(DiskUsage {
            total_bytes: total,
            available_bytes: available,
            used_bytes: used,
        })
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn get_disk_usage(app: AppHandle) -> Result<DiskUsage, String> {
    let dir = canopy_dir(&app)?;
    let path_str = dir
        .to_str()
        .ok_or_else(|| "CANOPY_LOCAL_DIR is not valid UTF-8".to_string())?;
    // Use GetDiskFreeSpaceExW via windows-sys
    use std::os::windows::ffi::OsStrExt;
    let wide: Vec<u16> = dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let mut free_bytes: u64 = 0;
    let mut total_bytes: u64 = 0;
    let mut total_free: u64 = 0;
    let ok = unsafe {
        windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_bytes as *mut u64 as _,
            &mut total_bytes as *mut u64 as _,
            &mut total_free as *mut u64 as _,
        )
    };
    if ok == 0 {
        return Err(format!("Failed to get disk usage for {}", path_str));
    }
    Ok(DiskUsage {
        total_bytes,
        available_bytes: free_bytes,
        used_bytes: total_bytes.saturating_sub(total_free),
    })
}

#[tauri::command]
pub fn check_canopy_dir(app: AppHandle) -> Result<bool, String> {
    let dir = canopy_dir(&app)?;
    let ok = match fs::metadata(&dir) {
        Ok(m) => m.is_dir(),
        Err(_) => false,
    };
    info!("check_canopy_dir: {} -> {}", dir.display(), ok);
    Ok(ok)
}

#[tauri::command]
pub fn tail_app_log(app: AppHandle, lines: Option<usize>) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(100);
    let log_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let path = log_dir.join("harvest-gui.log");
    let mut file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;

    let file_len = file
        .metadata()
        .map_err(|e| format!("Failed to read metadata: {}", e))?
        .len();

    if file_len == 0 {
        return Ok(Vec::new());
    }

    // Read last chunk (same logic as tail_log)
    let chunk_size: u64 = 64 * 1024;
    let start = file_len.saturating_sub(chunk_size);
    file.seek(SeekFrom::Start(start))
        .map_err(|e| format!("Failed to seek: {}", e))?;
    let mut buf = String::new();
    file.read_to_string(&mut buf)
        .map_err(|e| format!("Failed to read log: {}", e))?;

    let all_lines: Vec<&str> = buf.lines().collect();
    let skip = all_lines.len().saturating_sub(n);
    Ok(all_lines[skip..].iter().map(|s| s.to_string()).collect())
}

#[tauri::command]
pub fn set_cutover_date(app: AppHandle, date: String) -> Result<(), String> {
    let dir = canopy_dir(&app)?;
    let harvest_dir = dir.join(".harvest");
    fs::create_dir_all(&harvest_dir)
        .map_err(|e| format!("Failed to create .harvest dir: {}", e))?;
    let path = harvest_dir.join("last_poll.json");
    let content = format!("{{\"last_poll_ts\": \"{}T00:00:00Z\"}}", date);
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to write last_poll.json: {}", e))?;
    info!("cutover date set to {} at {}", date, path.display());
    Ok(())
}

#[tauri::command]
pub fn check_aria2_rpc() -> Result<bool, String> {
    use std::io::{Write as IoWrite, Read as IoRead};
    use std::net::TcpStream;
    use std::time::Duration;

    let body = r#"{"jsonrpc":"2.0","id":"1","method":"aria2.getVersion"}"#;
    let request = format!(
        "POST /jsonrpc HTTP/1.1\r\nHost: localhost:6800\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );

    let stream = TcpStream::connect_timeout(
        &"127.0.0.1:6800".parse().unwrap(),
        Duration::from_secs(2),
    );

    match stream {
        Ok(mut s) => {
            s.set_read_timeout(Some(Duration::from_secs(2))).ok();
            s.set_write_timeout(Some(Duration::from_secs(2))).ok();
            if s.write_all(request.as_bytes()).is_err() {
                return Ok(false);
            }
            let mut response = vec![0u8; 1024];
            match s.read(&mut response) {
                Ok(n) if n > 0 => {
                    let resp = String::from_utf8_lossy(&response[..n]);
                    Ok(resp.contains("200") || resp.contains("\"result\""))
                }
                _ => Ok(false),
            }
        }
        Err(_) => Ok(false),
    }
}
