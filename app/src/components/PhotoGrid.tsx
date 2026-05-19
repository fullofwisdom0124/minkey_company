import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLibrary, useFilteredPhotos } from "@/store/library";
import { PhotoThumbnail } from "./PhotoThumbnail";
import type { PhotoInfo } from "@/types/photo";

export function PhotoGrid() {
  const photos = useFilteredPhotos();
  const cell = useLibrary((s) => s.thumbnailSize);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const selectOnly = useLibrary((s) => s.selectOnly);
  const toggleInSelection = useLibrary((s) => s.toggleInSelection);
  const extendSelectionTo = useLibrary((s) => s.extendSelectionTo);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const gap = 6;

  const rows = useMemo(() => {
    const width = parentRef.current?.clientWidth ?? window.innerWidth - 280;
    const cols = Math.max(1, Math.floor((width - gap) / (cell + gap)));
    const out: PhotoInfo[][] = [];
    for (let i = 0; i < photos.length; i += cols) {
      out.push(photos.slice(i, i + cols));
    }
    return { rows: out, cols };
  }, [photos, cell]);

  const rowVirtualizer = useVirtualizer({
    count: rows.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cell + gap,
    overscan: 4,
  });

  function onClick(photo: PhotoInfo, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey) toggleInSelection(photo.id);
    else if (e.shiftKey) extendSelectionTo(photo.id);
    else selectOnly(photo.id);
  }

  function onDoubleClick(photo: PhotoInfo) {
    selectOnly(photo.id);
    setViewMode("detail");
  }

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-auto bg-chrome-100"
      tabIndex={0}
    >
      <div
        style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows.rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${rows.cols}, minmax(0, 1fr))`,
                gap: `${gap}px`,
                padding: `0 ${gap}px ${gap}px ${gap}px`,
              }}
            >
              {row.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  cellSize={cell}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
