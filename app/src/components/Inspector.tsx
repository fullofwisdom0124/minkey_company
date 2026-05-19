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
      <aside className="flex h-full items-center justify-center text-[12px] text-chrome-500">
        No photo selected
      </aside>
    );
  }

  const flag = state?.flag ?? "unflagged";
  const rating = state?.rating ?? 0;
  const colorLabel = state?.colorLabel ?? "none";

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-3 text-[12px] text-chrome-900">
      <section>
        <div className="truncate text-[13px] font-medium" title={photo.fileName}>
          {photo.fileName}
        </div>
        <div className="mt-0.5 space-y-0.5 text-[11px] text-chrome-500">
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
          <FlagPill label="Pick" className="bg-flag-pick text-white" active={flag === "pick"} onClick={() => setFlag("pick")} />
          <FlagPill label="Reject" className="bg-flag-reject text-white" active={flag === "reject"} onClick={() => setFlag("reject")} />
          <FlagPill label="Clear" className="bg-chrome-300 text-chrome-900" active={flag === "unflagged"} onClick={() => setFlag("unflagged")} />
        </div>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setRating(rating === i ? 0 : i)}
              className="text-[16px] leading-none text-flag-yellow transition hover:scale-110"
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
                "h-5 w-5 rounded-full ring-1 ring-black/10 transition",
                colorLabel === c && "ring-2 ring-chrome-900 ring-offset-2 ring-offset-chrome-50"
              )}
              style={{
                backgroundColor: c === "none" ? "#ffffff" : COLOR_HEX[c],
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
  return <div className="text-[10px] font-semibold uppercase tracking-wider text-chrome-500">{children}</div>;
}

function Divider() {
  return <div className="border-t border-black/[0.06]" />;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-chrome-500">{label}</span>
      <span className="truncate text-chrome-900">{value}</span>
    </div>
  );
}

interface FlagPillProps {
  label: string;
  className: string;
  active: boolean;
  onClick: (flag: PhotoFlag) => void;
}

function FlagPill({ label, className, active, onClick }: FlagPillProps) {
  const flag: PhotoFlag = label === "Clear" ? "unflagged" : (label.toLowerCase() as PhotoFlag);
  return (
    <button
      onClick={() => onClick(flag)}
      className={clsx(
        "flex-1 rounded-full px-2 py-1 text-[11px] transition",
        active ? className : "bg-chrome-200 text-chrome-700 hover:bg-chrome-300"
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
