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

fn canopy_dir() -> Result<PathBuf, String> {
    env::var("CANOPY_LOCAL_DIR")
        .map(PathBuf::from)
        .map_err(|_| "CANOPY_LOCAL_DIR environment variable is not set".to_string())
}

#[tauri::command]
pub fn get_processed() -> Result<HashMap<String, String>, String> {
    let path = canopy_dir()?.join(".harvest/processed_collects.json");
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[tauri::command]
pub fn get_last_poll() -> Result<Value, String> {
    let path = canopy_dir()?.join(".harvest/last_poll.json");
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
pub fn list_collect_files() -> Result<Vec<CollectEntry>, String> {
    let collects_dir = canopy_dir()?.join("collects");
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

#[derive(Serialize)]
pub struct ConfigEntry {
    pub name: String,
    pub status: String,
    pub value: String,
}

#[tauri::command]
pub fn get_config() -> Vec<ConfigEntry> {
    let vars = [
        "CANOPY_CLIENT_ID",
        "CANOPY_CLIENT_SECRET",
        "CANOPY_ORG_ID",
        "CANOPY_LOCAL_DIR",
        "CANOPY_MODE",
    ];

    vars.iter()
        .map(|&name| match env::var(name) {
            Ok(val) => {
                let display_val = if name == "CANOPY_CLIENT_SECRET" {
                    let last4: String = val.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
                    if last4.is_empty() {
                        "****".to_string()
                    } else {
                        format!("****{}", last4)
                    }
                } else {
                    val
                };
                ConfigEntry {
                    name: name.to_string(),
                    status: "set".to_string(),
                    value: display_val,
                }
            }
            Err(_) => ConfigEntry {
                name: name.to_string(),
                status: "missing".to_string(),
                value: String::new(),
            },
        })
        .collect()
}

#[tauri::command]
pub fn tail_log(lines: Option<usize>) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(50);
    let path = canopy_dir()?.join("harvest.log");
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
pub fn list_assets() -> Result<Vec<String>, String> {
    let output = Command::new("uv")
        .args(["run", "python", "-m", "harvest", "--assets"])
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
pub fn get_disk_usage() -> Result<DiskUsage, String> {
    use std::os::unix::ffi::OsStrExt;
    let dir = canopy_dir()?;
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
pub fn get_disk_usage() -> Result<DiskUsage, String> {
    let dir = canopy_dir()?;
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
pub fn check_canopy_dir() -> Result<bool, String> {
    let dir = canopy_dir()?;
    match fs::metadata(&dir) {
        Ok(m) => Ok(m.is_dir()),
        Err(_) => Ok(false),
    }
}
