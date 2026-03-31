use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub canopy_client_id: String,
    #[serde(default)]
    pub canopy_client_secret: String,
    #[serde(default)]
    pub canopy_org_id: String,
    #[serde(default)]
    pub canopy_local_dir: String,
    #[serde(default = "default_mode")]
    pub canopy_mode: String,
}

fn default_mode() -> String {
    "sandbox".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            canopy_client_id: String::new(),
            canopy_client_secret: String::new(),
            canopy_org_id: String::new(),
            canopy_local_dir: String::new(),
            canopy_mode: default_mode(),
        }
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join("config.json"))
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        let config = AppConfig::default();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config dir: {}", e))?;
        }
        let json = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        fs::write(&path, json).map_err(|e| format!("Failed to write config: {}", e))?;
        return Ok(config);
    }
    let data =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Failed to parse config: {}", e))
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write config: {}", e))
}

#[derive(Serialize)]
pub struct ResolvedConfigEntry {
    pub name: String,
    pub status: String,
    pub value: String,
    pub source: String,
}

fn resolve(config_val: &str, env_name: &str) -> (String, String) {
    if !config_val.is_empty() {
        (config_val.to_string(), "config".to_string())
    } else {
        match env::var(env_name) {
            Ok(v) if !v.is_empty() => (v, "env".to_string()),
            _ => (String::new(), "none".to_string()),
        }
    }
}

fn mask_secret(val: &str) -> String {
    let last4: String = val
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    if last4.is_empty() {
        "****".to_string()
    } else {
        format!("****{}", last4)
    }
}

#[tauri::command]
pub fn get_resolved_config(app: AppHandle) -> Result<Vec<ResolvedConfigEntry>, String> {
    let config = load_config(app)?;

    let fields = [
        ("CANOPY_CLIENT_ID", config.canopy_client_id.as_str()),
        ("CANOPY_CLIENT_SECRET", config.canopy_client_secret.as_str()),
        ("CANOPY_ORG_ID", config.canopy_org_id.as_str()),
        ("CANOPY_LOCAL_DIR", config.canopy_local_dir.as_str()),
        ("CANOPY_MODE", config.canopy_mode.as_str()),
    ];

    Ok(fields
        .iter()
        .map(|(name, config_val)| {
            let (val, source) = resolve(config_val, name);
            let status = if val.is_empty() {
                "missing".to_string()
            } else {
                "set".to_string()
            };
            let display_val = if *name == "CANOPY_CLIENT_SECRET" && !val.is_empty() {
                mask_secret(&val)
            } else {
                val
            };
            ResolvedConfigEntry {
                name: name.to_string(),
                status,
                value: display_val,
                source,
            }
        })
        .collect())
}

pub fn get_resolved_env(app: AppHandle) -> Result<Vec<(String, String)>, String> {
    let config = load_config(app)?;

    let fields = [
        ("CANOPY_CLIENT_ID", config.canopy_client_id.as_str()),
        ("CANOPY_CLIENT_SECRET", config.canopy_client_secret.as_str()),
        ("CANOPY_ORG_ID", config.canopy_org_id.as_str()),
        ("CANOPY_LOCAL_DIR", config.canopy_local_dir.as_str()),
        ("CANOPY_MODE", config.canopy_mode.as_str()),
    ];

    Ok(fields
        .iter()
        .map(|(name, config_val)| {
            let (val, _) = resolve(config_val, name);
            (name.to_string(), val)
        })
        .filter(|(_, v)| !v.is_empty())
        .collect())
}
