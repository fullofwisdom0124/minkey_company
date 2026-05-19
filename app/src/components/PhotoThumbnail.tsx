import clsx from "clsx";
import { useLibrary } from "@/store/library";
import { useThumbnail } from "@/lib/thumbnails";
import type { PhotoInfo } from "@/types/photo";
import { COLOR_HEX } from "@/types/photo";

interface Props {
  photo: PhotoInfo;
  cellSize: number;
  onClick: (photo: PhotoInfo, e: React.MouseEvent) => void;
  onDoubleClick: (photo: PhotoInfo) => void;
}

export function PhotoThumbnail({ photo, cellSize, onClick, onDoubleClick }: Props) {
  const url = useThumbnail(photo.path, 384);
  const isSelected = useLibrary((s) => s.selection.has(photo.id));
  const isFocused = useLibrary((s) => s.focusedId === photo.id);
  const state = useLibrary((s) => s.states[photo.id]);
  const flag = state?.flag ?? "unflagged";
  const rating = state?.rating ?? 0;
  const colorLabel = state?.colorLabel ?? "none";

  return (
    <div
      onClick={(e) => onClick(photo, e)}
      onDoubleClick={() => onDoubleClick(photo)}
      style={{ height: cellSize }}
      className={clsx(
        "group relative cursor-default overflow-hidden rounded-md bg-chrome-800",
        flag === "reject" && "opacity-50"
      )}
    >
      {url ? (
        <img
          src={url}
          alt={photo.fileName}
          loading="lazy"
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-chrome-700" />
      )}

      <div
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-md ring-inset transition",
          isSelected
            ? "ring-[3px] ring-blue-500"
            : isFocused
            ? "ring-2 ring-blue-400/60"
            : "ring-0"
        )}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
        <div className="flex items-center gap-1">
          {flag === "pick" && <Badge color="#32d74b" symbol="✓" />}
          {flag === "reject" && <Badge color="#ff453a" symbol="✕" />}
          {colorLabel !== "none" && (
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
              style={{ backgroundColor: COLOR_HEX[colorLabel] }}
            />
          )}
        </div>
      </div>

      {rating > 0 && (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] leading-none text-yellow-400">
          {"★".repeat(rating)}
        </div>
      )}
    </div>
  );
}

function Badge({ color, symbol }: { color: string; symbol: string }) {
  return (
    <span
      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {symbol}
    </span>
  );
}
