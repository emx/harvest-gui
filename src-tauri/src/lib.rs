mod commands;

use commands::process::HarvestProcess;
use std::sync::Mutex;

use log::LevelFilter;
use simplelog::{CombinedLogger, Config, WriteLogger};

fn init_logging(app: &tauri::App) {
    let log_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&log_dir).expect("failed to create app data dir");
    let log_path = log_dir.join("harvest-gui.log");

    let file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .expect("failed to open harvest-gui.log");

    CombinedLogger::init(vec![
        WriteLogger::new(LevelFilter::Info, Config::default(), file),
    ])
    .expect("failed to init logger");

    log::info!("harvest-gui started, log at {}", log_path.display());
}

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(HarvestProcess(Mutex::new(None)))
        .setup(|app| {
            init_logging(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_processed,
            commands::get_last_poll,
            commands::list_collect_files,
            commands::tail_log,
            commands::tail_app_log,
            commands::list_assets,
            commands::get_disk_usage,
            commands::check_canopy_dir,
            commands::config::load_config,
            commands::config::save_config,
            commands::config::get_resolved_config,
            commands::process::start_harvest,
            commands::process::stop_harvest,
            commands::process::harvest_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
