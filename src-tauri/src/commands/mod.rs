pub mod config;
pub mod process;

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
        Some(python)
    } else {
        // Dev mode: check src-tauri/resources directly
        let dev_python = if cfg!(windows) {
            PathBuf::from("resources/harvest-venv/Scripts/python.exe")
        } else {
            PathBuf::from("resources/harvest-venv/bin/python")
        };
        if dev_python.exists() {
            Some(dev_python)
        } else {
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
        Some(aria2c)
    } else {
        let dev_aria2c = if cfg!(windows) {
            PathBuf::from("resources/bin/aria2c.exe")
        } else {
            PathBuf::from("resources/bin/aria2c")
        };
        if dev_aria2c.exists() {
            Some(dev_aria2c)
        } else {
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
    env::var("CANOPY_LOCAL_DIR")
        .map(PathBuf::from)
        .map_err(|_| "CANOPY_LOCAL_DIR is not configured. Set it in Settings.".to_string())
}

#[tauri::command]
pub fn get_processed(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let path = canopy_dir(&app)?.join(".harvest/processed_collects.json");
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[tauri::command]
pub fn get_last_poll(app: AppHandle) -> Result<Value, String> {
    let path = canopy_dir(&app)?.join(".harvest/last_poll.json");
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
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
        return Err(format!("harvest --assets failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.lines().map(|s| s.to_string()).collect())
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
    match fs::metadata(&dir) {
        Ok(m) => Ok(m.is_dir()),
        Err(_) => Ok(false),
    }
}
