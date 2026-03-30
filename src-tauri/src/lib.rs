mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_processed,
            commands::get_last_poll,
            commands::list_collect_files,
            commands::get_config,
            commands::tail_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
