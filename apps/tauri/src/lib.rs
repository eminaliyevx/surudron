mod error;
mod serial;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(serial::SerialState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            serial::start_watcher(app.handle().clone());

            return Ok(());
        })
        .invoke_handler(tauri::generate_handler![
            serial::list_ports,
            serial::connect_port,
            serial::disconnect_port,
            serial::get_active_port,
            serial::send_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
