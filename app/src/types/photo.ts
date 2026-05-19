export type PhotoFlag = "unflagged" | "pick" | "reject";

export type ColorLabel = "none" | "red" | "yellow" | "green" | "blue" | "purple";

export interface PhotoInfo {
  id: string;
  path: string;
  fileName: string;
  pixelWidth?: number;
  pixelHeight?: number;
  fileSize?: number;
  captureDate?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
}

export interface PhotoState {
  flag: PhotoFlag;
  rating: number;
  colorLabel: ColorLabel;
}

export type ViewMode = "grid" | "detail";

export type SortKey = "captureDate" | "fileName" | "rating";

export type Filter =
  | { kind: "all" }
  | { kind: "pick" }
  | { kind: "reject" }
  | { kind: "unflagged" }
  | { kind: "rated"; min: number }
  | { kind: "color"; color: ColorLabel };

export interface ExportSummary {
  copied: number;
  skipped: number;
  failed: string[];
}

export const COLOR_LABELS: ColorLabel[] = ["red", "yellow", "green", "blue", "purple"];

export const COLOR_HEX: Record<ColorLabel, string> = {
  none: "transparent",
  red: "#ff453a",
  yellow: "#ffd60a",
  green: "#32d74b",
  blue: "#0a84ff",
  purple: "#bf5af2",
};
