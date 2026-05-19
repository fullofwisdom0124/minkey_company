use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use image::imageops::FilterType;
use sha2::{Digest, Sha256};
use tauri::Manager;

static CACHE_ROOT: OnceLock<PathBuf> = OnceLock::new();

fn cache_root(app: &tauri::AppHandle) -> PathBuf {
    CACHE_ROOT
        .get_or_init(|| {
            let base = app
                .path()
                .app_cache_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            let dir = base.join("thumbnails");
            let _ = fs::create_dir_all(&dir);
            dir
        })
        .clone()
}

fn cache_path(root: &PathBuf, src: &str, size: u32, kind: &str) -> PathBuf {
    let mut hasher = Sha256::new();
    hasher.update(src.as_bytes());
    hasher.update(size.to_le_bytes());
    hasher.update(kind.as_bytes());
    let key = hex::encode(hasher.finalize());
    root.join(format!("{key}.jpg"))
}

fn render_resized(src: &str, max_side: u32, quality: u8) -> Result<Vec<u8>, String> {
    let img = image::open(src).map_err(|e| format!("decode failed: {e}"))?;
    let (w, h) = (img.width(), img.height());
    let scale = (max_side as f32 / w.max(h) as f32).min(1.0);
    let target_w = ((w as f32) * scale).round().max(1.0) as u32;
    let target_h = ((h as f32) * scale).round().max(1.0) as u32;

    let resized = if scale < 1.0 {
        img.resize_exact(target_w, target_h, FilterType::Triangle)
    } else {
        img
    };

    let rgb = resized.to_rgb8();
    let mut out = Vec::with_capacity((target_w * target_h) as usize);
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality);
    encoder
        .encode(rgb.as_raw(), target_w, target_h, image::ExtendedColorType::Rgb8)
        .map_err(|e| format!("encode failed: {e}"))?;
    Ok(out)
}

#[tauri::command]
pub async fn generate_thumbnail(
    app: tauri::AppHandle,
    path: String,
    size: u32,
) -> Result<String, String> {
    let root = cache_root(&app);
    let cached = cache_path(&root, &path, size, "thumb");
    if cached.exists() {
        return Ok(cached.to_string_lossy().to_string());
    }
    let bytes = tauri::async_runtime::spawn_blocking(move || render_resized(&path, size, 82))
        .await
        .map_err(|e| e.to_string())??;
    fs::write(&cached, &bytes).map_err(|e| e.to_string())?;
    Ok(cached.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_preview(
    app: tauri::AppHandle,
    path: String,
    max_size: u32,
) -> Result<String, String> {
    let root = cache_root(&app);
    let cached = cache_path(&root, &path, max_size, "preview");
    if cached.exists() {
        return Ok(cached.to_string_lossy().to_string());
    }
    let bytes = tauri::async_runtime::spawn_blocking(move || render_resized(&path, max_size, 90))
        .await
        .map_err(|e| e.to_string())??;
    fs::write(&cached, &bytes).map_err(|e| e.to_string())?;
    Ok(cached.to_string_lossy().to_string())
}
