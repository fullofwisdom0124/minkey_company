import clsx from "clsx";
import { useLibrary } from "@/store/library";
import { COLOR_HEX, COLOR_LABELS, type ColorLabel, type PhotoFlag } from "@/types/photo";

export function Inspector() {
  const focusedId = useLibrary((s) => s.focusedId);
  const photo = useLibrary((s) => s.photos.find((p) => p.id === focusedId));
  const state = useLibrary((s) => (focusedId ? s.states[focusedId] : undefined));
  const setFlag = useLibrary((s) => s.setFlagOnTargets);
  const setRating = useLibrary((s) => s.setRatingOnTargets);
  const setColor = useLibrary((s) => s.setColorOnTargets);

  if (!photo) {
    return (
      <aside className="flex h-full items-center justify-center text-[12px] text-chrome-400">
        No photo selected
      </aside>
    );
  }

  const flag = state?.flag ?? "unflagged";
  const rating = state?.rating ?? 0;
  const colorLabel = state?.colorLabel ?? "none";

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-3 text-[12px]">
      <section>
        <div className="truncate text-[13px] font-medium text-white" title={photo.fileName}>
          {photo.fileName}
        </div>
        <div className="mt-0.5 space-y-0.5 text-[11px] text-chrome-400">
          {photo.captureDate && <div>{new Date(photo.captureDate).toLocaleString()}</div>}
          {photo.pixelWidth && photo.pixelHeight && (
            <div>{photo.pixelWidth} × {photo.pixelHeight}</div>
          )}
          {photo.fileSize !== undefined && <div>{formatBytes(photo.fileSize)}</div>}
        </div>
      </section>

      <Divider />

      <section className="space-y-3">
        <Heading>Selection</Heading>
        <div className="flex gap-1.5">
          <FlagPill label="Pick" color="bg-green-500" active={flag === "pick"} onClick={() => setFlag("pick")} />
          <FlagPill label="Reject" color="bg-red-500" active={flag === "reject"} onClick={() => setFlag("reject")} />
          <FlagPill label="Clear" color="bg-chrome-600" active={flag === "unflagged"} onClick={() => setFlag("unflagged")} />
        </div>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setRating(rating === i ? 0 : i)}
              className="text-[16px] leading-none text-yellow-400 hover:scale-110 transition"
              title={`${i} star${i > 1 ? "s" : ""}`}
            >
              {i <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(["none", ...COLOR_LABELS] as ColorLabel[]).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={clsx(
                "h-5 w-5 rounded-full border transition",
                colorLabel === c ? "ring-2 ring-white/80 ring-offset-1 ring-offset-chrome-900" : "border-white/10"
              )}
              style={{
                backgroundColor: c === "none" ? "rgba(255,255,255,0.05)" : COLOR_HEX[c],
              }}
              title={c}
            />
          ))}
        </div>
      </section>

      <Divider />

      <section className="space-y-1">
        <Heading>Camera</Heading>
        <Row label="Make" value={photo.cameraMake} />
        <Row label="Model" value={photo.cameraModel} />
        <Row label="Lens" value={photo.lensModel} />
        <Row label="Focal" value={photo.focalLength ? `${Math.round(photo.focalLength)}mm` : undefined} />
        <Row label="Aperture" value={photo.aperture ? `f/${photo.aperture.toFixed(1)}` : undefined} />
        <Row label="Shutter" value={photo.shutterSpeed} />
        <Row label="ISO" value={photo.iso?.toString()} />
      </section>
    </aside>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-wider text-chrome-400">{children}</div>;
}

function Divider() {
  return <div className="border-t border-white/5" />;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-chrome-400">{label}</span>
      <span className="truncate text-chrome-100">{value}</span>
    </div>
  );
}

interface FlagPillProps {
  label: string;
  color: string;
  active: boolean;
  onClick: (flag: PhotoFlag) => void;
}

function FlagPill({ label, color, active, onClick }: FlagPillProps) {
  return (
    <button
      onClick={() => onClick(label.toLowerCase() === "clear" ? "unflagged" : (label.toLowerCase() as PhotoFlag))}
      className={clsx(
        "flex-1 rounded-full px-2 py-1 text-[11px] transition",
        active ? `${color} text-white` : "bg-white/5 text-chrome-200 hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
