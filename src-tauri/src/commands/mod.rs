use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

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
                    if val.len() >= 4 {
                        format!("****{}", &val[val.len() - 4..])
                    } else {
                        "****".to_string()
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
    let file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
    let reader = BufReader::new(file);
    let all_lines: Vec<String> = reader
        .lines()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read log: {}", e))?;

    let start = all_lines.len().saturating_sub(n);
    Ok(all_lines[start..].to_vec())
}
