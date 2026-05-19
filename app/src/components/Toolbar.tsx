import clsx from "clsx";
import { open } from "@tauri-apps/plugin-dialog";
import { useLibrary } from "@/store/library";
import { scanFolder, exportPhotos } from "@/lib/ipc";
import type { SortKey } from "@/types/photo";

export function Toolbar() {
  const viewMode = useLibrary((s) => s.viewMode);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const thumbnailSize = useLibrary((s) => s.thumbnailSize);
  const setThumbnailSize = useLibrary((s) => s.setThumbnailSize);
  const sort = useLibrary((s) => s.sort);
  const setSort = useLibrary((s) => s.setSort);
  const sortAscending = useLibrary((s) => s.sortAscending);
  const setSortAscending = useLibrary((s) => s.setSortAscending);
  const toggleInspector = useLibrary((s) => s.toggleInspector);
  const toggleSidebar = useLibrary((s) => s.toggleSidebar);
  const setPhotos = useLibrary((s) => s.setPhotos);
  const setImporting = useLibrary((s) => s.setImporting);
  const rootPath = useLibrary((s) => s.rootPath);

  async function onOpen() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose SD card or folder",
    });
    if (!selected || typeof selected !== "string") return;
    setImporting(true);
    try {
      const photos = await scanFolder(selected);
      setPhotos(photos, selected);
    } finally {
      setImporting(false);
    }
  }

  async function onExport() {
    const s = useLibrary.getState();
    const ids = s.selection.size > 0
      ? new Set(s.selection)
      : new Set(s.photos.filter((p) => (s.states[p.id]?.flag ?? "unflagged") === "pick").map((p) => p.id));
    const paths = s.photos.filter((p) => ids.has(p.id)).map((p) => p.path);
    if (paths.length === 0) return;
    const dest = await open({ directory: true, multiple: false, title: "Choose destination" });
    if (!dest || typeof dest !== "string") return;
    await exportPhotos(paths, dest, "copy");
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-chrome-50/85 px-3 backdrop-blur">
      <IconButton title="Toggle sidebar" onClick={toggleSidebar}>
        <SidebarIcon />
      </IconButton>

      <Segmented
        value={viewMode}
        options={[
          { value: "grid", label: <GridIcon /> },
          { value: "detail", label: <DetailIcon /> },
        ]}
        onChange={(v) => setViewMode(v)}
      />

      <button
        onClick={onOpen}
        className="rounded-md bg-white px-2.5 py-1 text-[12px] font-medium text-chrome-900 shadow-cell ring-1 ring-black/5 hover:bg-chrome-100"
      >
        Open Folder
      </button>

      {rootPath && (
        <span className="ml-1 max-w-[280px] truncate text-[11px] text-chrome-500" title={rootPath}>
          {rootPath}
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {viewMode === "grid" && (
          <div className="flex items-center gap-2 text-chrome-500">
            <SmallPhotoIcon />
            <input
              type="range"
              min={80}
              max={360}
              value={thumbnailSize}
              onChange={(e) => setThumbnailSize(Number(e.target.value))}
              className="h-1 w-32"
            />
            <LargePhotoIcon />
          </div>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md bg-white px-2 py-1 text-[12px] text-chrome-900 outline-none ring-1 ring-black/5 hover:bg-chrome-100"
        >
          <option value="captureDate">Capture Date</option>
          <option value="fileName">File Name</option>
          <option value="rating">Rating</option>
        </select>

        <IconButton
          title={sortAscending ? "Ascending" : "Descending"}
          onClick={() => setSortAscending(!sortAscending)}
        >
          <span className="text-[12px] text-chrome-700">{sortAscending ? "↑" : "↓"}</span>
        </IconButton>

        <button
          onClick={onExport}
          className="rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-white hover:bg-accent-hover"
        >
          Export
        </button>

        <IconButton title="Toggle inspector" onClick={toggleInspector}>
          <InspectorIcon />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-chrome-700 hover:bg-black/[0.05] active:bg-black/[0.08]"
    >
      {children}
    </button>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}

function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex rounded-md bg-chrome-200/80 p-0.5 ring-1 ring-black/[0.04]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "rounded px-2 py-0.5 transition",
            value === opt.value
              ? "bg-white text-chrome-900 shadow-sm"
              : "text-chrome-600 hover:text-chrome-900"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function DetailIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="5.5" y1="2.5" x2="5.5" y2="13.5" />
    </svg>
  );
}

function InspectorIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="10.5" y1="2.5" x2="10.5" y2="13.5" />
    </svg>
  );
}

function SmallPhotoIcon() {
  return <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor"><rect x="2" y="3" width="12" height="10" rx="1.5"/></svg>;
}
function LargePhotoIcon() {
  return <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><rect x="1" y="2" width="14" height="12" rx="1.5"/></svg>;
}
