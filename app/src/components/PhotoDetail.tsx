import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useLibrary, useFilteredPhotos } from "@/store/library";
import { usePreview } from "@/lib/thumbnails";
import { Filmstrip } from "./Filmstrip";

export function PhotoDetail() {
  const photos = useFilteredPhotos();
  const focusedId = useLibrary((s) => s.focusedId);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const photo = photos.find((p) => p.id === focusedId) ?? null;
  const url = usePreview(photo?.path ?? null, 4096);

  const state = useLibrary((s) => (photo ? s.states[photo.id] : undefined));

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [focusedId]);

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.25, Math.min(8, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    }
  }

  function onDoubleClick() {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, baseX: pan.x, baseY: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.x),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.y),
    });
  }
  function onMouseUp() {
    dragRef.current = null;
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative flex-1 overflow-hidden bg-black"
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {url ? (
          <img
            src={url}
            alt={photo?.fileName ?? ""}
            draggable={false}
            className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain transition-[transform] duration-100"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-chrome-400">
            {photo ? "Loading…" : "No photo"}
          </div>
        )}

        {photo && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <div className="flex items-center gap-2">
              {state?.flag === "pick" && <Pill color="bg-green-500/85">Pick</Pill>}
              {state?.flag === "reject" && <Pill color="bg-red-500/85">Reject</Pill>}
              {state?.rating ? (
                <Pill color="bg-black/55">
                  <span className="text-yellow-400">{"★".repeat(state.rating)}</span>
                </Pill>
              ) : null}
            </div>
            <Pill color="bg-black/55">
              <span className="font-mono text-[11px] text-white/80">{photo.fileName}</span>
            </Pill>
          </div>
        )}

        <button
          onClick={() => setViewMode("grid")}
          className="absolute left-3 bottom-3 rounded bg-white/10 px-2 py-1 text-[11px] text-white/90 hover:bg-white/20"
          title="Back to grid (Esc)"
        >
          ← Grid
        </button>

        <div
          className={clsx(
            "absolute right-3 bottom-3 rounded bg-black/55 px-2 py-1 font-mono text-[10px] text-white/70",
            zoom === 1 && "opacity-0"
          )}
        >
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div className="h-24 shrink-0 border-t border-white/5 bg-chrome-900">
        <Filmstrip />
      </div>
    </div>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] text-white ${color}`}>
      {children}
    </span>
  );
}
