import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { PhotoInfo, ExportSummary } from "@/types/photo";

export async function scanFolder(path: string): Promise<PhotoInfo[]> {
  return await invoke<PhotoInfo[]>("scan_folder", { path });
}

export async function generateThumbnail(path: string, size: number): Promise<string> {
  const cached = await invoke<string>("generate_thumbnail", { path, size });
  return convertFileSrc(cached);
}

export async function generatePreview(path: string, maxSize: number): Promise<string> {
  const cached = await invoke<string>("generate_preview", { path, maxSize });
  return convertFileSrc(cached);
}

export async function exportPhotos(
  paths: string[],
  destination: string,
  mode: "copy" | "move"
): Promise<ExportSummary> {
  return await invoke<ExportSummary>("export_photos", { paths, destination, mode });
}
