import { useMemo } from "react";
import clsx from "clsx";
import { open } from "@tauri-apps/plugin-dialog";
import { Sidebar } from "@/components/Sidebar";
import { Toolbar } from "@/components/Toolbar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoDetail } from "@/components/PhotoDetail";
import { Inspector } from "@/components/Inspector";
import { useLibrary } from "@/store/library";
import { useKeyboard, type KeyBinding } from "@/lib/keyboard";
import { scanFolder, exportPhotos } from "@/lib/ipc";

export default function App() {
  const viewMode = useLibrary((s) => s.viewMode);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const showInspector = useLibrary((s) => s.showInspector);
  const showSidebar = useLibrary((s) => s.showSidebar);
  const toggleInspector = useLibrary((s) => s.toggleInspector);
  const isImporting = useLibrary((s) => s.isImporting);
  const hasPhotos = useLibrary((s) => s.photos.length > 0);
  const setPhotos = useLibrary((s) => s.setPhotos);
  const setImporting = useLibrary((s) => s.setImporting);

  const navigate = useLibrary((s) => s.navigate);
  const toggleFlag = useLibrary((s) => s.toggleFlagOnTargets);
  const setFlag = useLibrary((s) => s.setFlagOnTargets);
  const setRating = useLibrary((s) => s.setRatingOnTargets);

  const bindings = useMemo<KeyBinding[]>(
    () => [
      { key: "ArrowRight", action: () => navigate(1) },
      { key: "ArrowLeft", action: () => navigate(-1) },
      { key: "Enter", action: () => setViewMode(viewMode === "grid" ? "detail" : "grid") },
      { key: " ", action: () => setViewMode(viewMode === "grid" ? "detail" : "grid") },
      { key: "Escape", action: () => setViewMode("grid") },
      { key: "p", action: () => toggleFlag("pick") },
      { key: "P", action: () => toggleFlag("pick") },
      { key: "x", action: () => toggleFlag("reject") },
      { key: "X", action: () => toggleFlag("reject") },
      { key: "u", action: () => setFlag("unflagged") },
      { key: "U", action: () => setFlag("unflagged") },
      ...["0", "1", "2", "3", "4", "5"].map((n) => ({
        key: n,
        action: () => setRating(Number(n)),
      })),
      { key: "o", meta: true, action: openFolder },
      { key: "e", meta: true, shift: true, action: exportPicks },
      { key: "i", meta: true, alt: true, action: toggleInspector },
      { key: "g", meta: true, action: () => setViewMode("grid") },
      { key: "d", meta: true, action: () => setViewMode("detail") },
    ],
    [viewMode, navigate, setViewMode, toggleFlag, setFlag, setRating, toggleInspector]
  );

  useKeyboard(bindings);

  async function openFolder() {
    const selected = await open({ directory: true, multiple: false, title: "Choose SD card or folder" });
    if (!selected || typeof selected !== "string") return;
    setImporting(true);
    try {
      const photos = await scanFolder(selected);
      setPhotos(photos, selected);
    } finally {
      setImporting(false);
    }
  }

  async function exportPicks() {
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
    <div className="flex h-screen w-screen flex-col bg-chrome-900 font-system text-white">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div
          className={clsx(
            "shrink-0 border-r border-white/5 bg-chrome-900/70 backdrop-blur transition-[width] duration-200",
            showSidebar ? "w-56" : "w-0"
          )}
        >
          {showSidebar && <Sidebar />}
        </div>

        <main className="relative flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 overflow-hidden">
            {viewMode === "grid" ? <PhotoGrid /> : <PhotoDetail />}

            {isImporting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="rounded-lg bg-white/10 px-6 py-4 text-[13px]">
                  Importing photos…
                </div>
              </div>
            )}

            {!isImporting && !hasPhotos && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-chrome-400">
                <div className="text-5xl">▦</div>
                <div className="text-base text-white/80">No Photos Loaded</div>
                <button
                  onClick={openFolder}
                  className="mt-1 rounded bg-blue-500 px-3 py-1.5 text-[12px] text-white hover:bg-blue-400"
                >
                  Open Folder…
                </button>
                <div className="mt-1 text-[11px]">or press ⌘O</div>
              </div>
            )}
          </div>

          <div
            className={clsx(
              "shrink-0 border-l border-white/5 bg-chrome-900/70 backdrop-blur transition-[width] duration-200",
              showInspector ? "w-72" : "w-0"
            )}
          >
            {showInspector && <Inspector />}
          </div>
        </main>
      </div>
    </div>
  );
}
