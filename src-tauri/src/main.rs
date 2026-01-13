// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::files::read_vault,
            commands::files::read_file,
            commands::files::write_file,
            commands::files::create_file,
            commands::files::delete_file,
            commands::files::move_file,
            commands::files::list_files,
            commands::search::search_files,
            commands::templates::apply_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
