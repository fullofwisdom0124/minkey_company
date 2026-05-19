use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSummary {
    pub copied: u32,
    pub skipped: u32,
    pub failed: Vec<String>,
}

#[tauri::command]
pub async fn export_photos(
    paths: Vec<String>,
    destination: String,
    mode: String,
) -> Result<ExportSummary, String> {
    let dst_root = PathBuf::from(&destination);
    fs::create_dir_all(&dst_root).map_err(|e| e.to_string())?;

    let mut copied = 0u32;
    let mut skipped = 0u32;
    let mut failed: Vec<String> = Vec::new();

    for src in paths {
        let src_path = Path::new(&src);
        let Some(name) = src_path.file_name() else {
            failed.push(src);
            continue;
        };
        let dst = dst_root.join(name);
        if dst.exists() {
            skipped += 1;
            continue;
        }
        let result = if mode == "move" {
            fs::rename(src_path, &dst).or_else(|_| fs::copy(src_path, &dst).map(|_| ()))
        } else {
            fs::copy(src_path, &dst).map(|_| ())
        };
        match result {
            Ok(_) => copied += 1,
            Err(_) => failed.push(src),
        }
    }

    Ok(ExportSummary { copied, skipped, failed })
}
