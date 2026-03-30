mod commands;

use commands::process::HarvestProcess;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(HarvestProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            commands::get_processed,
            commands::get_last_poll,
            commands::list_collect_files,
            commands::get_config,
            commands::tail_log,
            commands::list_assets,
            commands::process::start_harvest,
            commands::process::stop_harvest,
            commands::process::harvest_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
