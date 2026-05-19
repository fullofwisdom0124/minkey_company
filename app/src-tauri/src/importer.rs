use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use rayon::prelude::*;
use serde::Serialize;
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PhotoInfo {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub pixel_width: Option<u32>,
    pub pixel_height: Option<u32>,
    pub file_size: Option<u64>,
    pub capture_date: Option<String>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub lens_model: Option<String>,
    pub focal_length: Option<f64>,
    pub aperture: Option<f64>,
    pub shutter_speed: Option<String>,
    pub iso: Option<u32>,
}

const SUPPORTED_EXTS: &[&str] = &[
    "jpg", "jpeg", "png", "tif", "tiff", "webp", "bmp", "gif", "heic", "heif",
    "cr2", "cr3", "crw", "nef", "nrw", "arw", "srf", "sr2", "raf", "orf", "rw2",
    "pef", "dng", "raw",
];

fn is_supported(p: &Path) -> bool {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|e| SUPPORTED_EXTS.iter().any(|s| s.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

#[tauri::command]
pub async fn scan_folder(path: String) -> Result<Vec<PhotoInfo>, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let mut entries: Vec<PathBuf> = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.into_path())
        .filter(|p| is_supported(p))
        .collect();

    entries.sort_by(|a, b| {
        a.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_ascii_lowercase()
            .cmp(
                &b.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase(),
            )
    });

    let infos: Vec<PhotoInfo> = entries
        .par_iter()
        .map(|p| read_info(p))
        .collect();

    Ok(infos)
}

fn read_info(path: &Path) -> PhotoInfo {
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let path_str = path.to_string_lossy().to_string();

    let file_size = std::fs::metadata(path).ok().map(|m| m.len());

    let mut info = PhotoInfo {
        id: Uuid::new_v4().to_string(),
        path: path_str,
        file_name,
        pixel_width: None,
        pixel_height: None,
        file_size,
        capture_date: None,
        camera_make: None,
        camera_model: None,
        lens_model: None,
        focal_length: None,
        aperture: None,
        shutter_speed: None,
        iso: None,
    };

    if let Ok(file) = File::open(path) {
        let mut reader = BufReader::new(file);
        if let Ok(exif) = exif::Reader::new().read_from_container(&mut reader) {
            read_exif(&exif, &mut info);
        }
    }

    if info.pixel_width.is_none() {
        if let Ok(dim) = image::image_dimensions(path) {
            info.pixel_width = Some(dim.0);
            info.pixel_height = Some(dim.1);
        }
    }

    if info.capture_date.is_none() {
        if let Ok(meta) = std::fs::metadata(path) {
            if let Ok(created) = meta.created().or_else(|_| meta.modified()) {
                if let Ok(secs) = created.duration_since(std::time::UNIX_EPOCH) {
                    let dt: DateTime<Utc> = Utc
                        .timestamp_opt(secs.as_secs() as i64, 0)
                        .single()
                        .unwrap_or_else(Utc::now);
                    info.capture_date = Some(dt.to_rfc3339());
                }
            }
        }
    }

    info
}

fn read_exif(exif: &exif::Exif, info: &mut PhotoInfo) {
    use exif::{In, Tag, Value};

    let get_str = |tag: Tag| -> Option<String> {
        exif.get_field(tag, In::PRIMARY).and_then(|f| match &f.value {
            Value::Ascii(v) => v.first().map(|b| String::from_utf8_lossy(b).trim().to_string()),
            _ => Some(f.display_value().to_string()),
        })
    };

    let get_u32 = |tag: Tag| -> Option<u32> {
        exif.get_field(tag, In::PRIMARY).and_then(|f| match &f.value {
            Value::Short(v) => v.first().map(|x| *x as u32),
            Value::Long(v) => v.first().copied(),
            _ => None,
        })
    };

    let get_rational = |tag: Tag| -> Option<f64> {
        exif.get_field(tag, In::PRIMARY).and_then(|f| match &f.value {
            Value::Rational(v) => v.first().map(|r| r.num as f64 / r.denom.max(1) as f64),
            _ => None,
        })
    };

    info.camera_make = get_str(Tag::Make);
    info.camera_model = get_str(Tag::Model);
    info.lens_model = get_str(Tag::LensModel);
    info.focal_length = get_rational(Tag::FocalLength);
    info.aperture = get_rational(Tag::FNumber);

    if let Some(t) = get_rational(Tag::ExposureTime) {
        info.shutter_speed = Some(format_shutter(t));
    }

    info.iso = get_u32(Tag::PhotographicSensitivity).or_else(|| get_u32(Tag::ISOSpeed));

    info.pixel_width = info.pixel_width.or_else(|| get_u32(Tag::PixelXDimension)).or_else(|| get_u32(Tag::ImageWidth));
    info.pixel_height = info.pixel_height.or_else(|| get_u32(Tag::PixelYDimension)).or_else(|| get_u32(Tag::ImageLength));

    if let Some(s) = get_str(Tag::DateTimeOriginal).or_else(|| get_str(Tag::DateTime)) {
        if let Ok(naive) = NaiveDateTime::parse_from_str(&s, "%Y:%m:%d %H:%M:%S") {
            let dt: DateTime<Utc> = Utc.from_utc_datetime(&naive);
            info.capture_date = Some(dt.to_rfc3339());
        }
    }
}

fn format_shutter(t: f64) -> String {
    if t >= 1.0 {
        format!("{:.1}s", t)
    } else if t > 0.0 {
        let denom = (1.0 / t).round() as u64;
        format!("1/{}s", denom)
    } else {
        "—".to_string()
    }
}
