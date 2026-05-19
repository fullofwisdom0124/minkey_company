import { forwardRef, useEffect, useRef } from "react";
import clsx from "clsx";
import { useLibrary, useFilteredPhotos } from "@/store/library";
import { useThumbnail } from "@/lib/thumbnails";
import type { PhotoInfo } from "@/types/photo";

export function Filmstrip() {
  const photos = useFilteredPhotos();
  const focusedId = useLibrary((s) => s.focusedId);
  const selectOnly = useLibrary((s) => s.selectOnly);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    focusedRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusedId]);

  return (
    <div
      ref={scrollerRef}
      className="flex h-full items-center gap-1 overflow-x-auto px-2"
    >
      {photos.map((p) => (
        <FilmCell
          key={p.id}
          ref={p.id === focusedId ? focusedRef : null}
          photo={p}
          active={p.id === focusedId}
          onClick={() => selectOnly(p.id)}
        />
      ))}
    </div>
  );
}

interface FilmCellProps {
  photo: PhotoInfo;
  active: boolean;
  onClick: () => void;
}

const FilmCell = forwardRef<HTMLButtonElement, FilmCellProps>(function FilmCell(
  { photo, active, onClick },
  ref
) {
  const url = useThumbnail(photo.path, 192);
  const state = useLibrary((s) => s.states[photo.id]);
  const flag = state?.flag ?? "unflagged";

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={clsx(
        "relative h-[72px] w-[100px] shrink-0 overflow-hidden rounded bg-chrome-200 transition",
        active ? "ring-2 ring-accent" : "ring-1 ring-black/[0.06]",
        flag === "reject" && "opacity-50"
      )}
    >
      {url && (
        <img
          src={url}
          alt={photo.fileName}
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      )}
      {flag === "pick" && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-flag-pick ring-1 ring-white" />
      )}
    </button>
  );
});
