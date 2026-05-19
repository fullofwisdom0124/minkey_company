mod exporter;
mod importer;
mod thumbnails;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            importer::scan_folder,
            thumbnails::generate_thumbnail,
            thumbnails::generate_preview,
            exporter::export_photos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PhotoSelector");
}
