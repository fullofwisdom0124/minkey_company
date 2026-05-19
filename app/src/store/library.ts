import { useMemo } from "react";
import { create } from "zustand";
import type {
  PhotoInfo,
  PhotoState,
  PhotoFlag,
  ColorLabel,
  ViewMode,
  SortKey,
  Filter,
} from "@/types/photo";

interface LibraryState {
  photos: PhotoInfo[];
  states: Record<string, PhotoState>;
  rootPath: string | null;
  isImporting: boolean;

  viewMode: ViewMode;
  filter: Filter;
  sort: SortKey;
  sortAscending: boolean;

  selection: Set<string>;
  focusedId: string | null;

  thumbnailSize: number;
  showInspector: boolean;
  showSidebar: boolean;

  setPhotos: (photos: PhotoInfo[], rootPath: string) => void;
  setImporting: (importing: boolean) => void;

  setViewMode: (mode: ViewMode) => void;
  setFilter: (filter: Filter) => void;
  setSort: (sort: SortKey) => void;
  setSortAscending: (asc: boolean) => void;

  setThumbnailSize: (size: number) => void;
  toggleInspector: () => void;
  toggleSidebar: () => void;

  setFocused: (id: string | null) => void;
  selectOnly: (id: string) => void;
  toggleInSelection: (id: string) => void;
  extendSelectionTo: (id: string) => void;
  clearSelection: () => void;

  stateOf: (id: string) => PhotoState;
  setFlagOnTargets: (flag: PhotoFlag) => void;
  toggleFlagOnTargets: (flag: PhotoFlag) => void;
  setRatingOnTargets: (rating: number) => void;
  setColorOnTargets: (color: ColorLabel) => void;

  navigate: (direction: 1 | -1) => void;
  filtered: () => PhotoInfo[];
}

export function applyFilter(
  photos: PhotoInfo[],
  states: Record<string, PhotoState>,
  filter: Filter,
  sort: SortKey,
  sortAscending: boolean
): PhotoInfo[] {
  const matches = photos.filter((p) => matchFilter(p, states[p.id] ?? defaultState, filter));
  return matches.sort((a, b) => {
    const sa = states[a.id] ?? defaultState;
    const sb = states[b.id] ?? defaultState;
    let cmp = 0;
    switch (sort) {
      case "captureDate": {
        const da = a.captureDate ? Date.parse(a.captureDate) : 0;
        const db = b.captureDate ? Date.parse(b.captureDate) : 0;
        cmp = da - db;
        break;
      }
      case "fileName":
        cmp = a.fileName.localeCompare(b.fileName, undefined, { numeric: true });
        break;
      case "rating":
        cmp = sa.rating - sb.rating;
        break;
    }
    return sortAscending ? cmp : -cmp;
  });
}

const defaultState: PhotoState = { flag: "unflagged", rating: 0, colorLabel: "none" };

export const useLibrary = create<LibraryState>()((set, get) => ({
  photos: [],
  states: {},
  rootPath: null,
  isImporting: false,

  viewMode: "grid",
  filter: { kind: "all" },
  sort: "captureDate",
  sortAscending: true,

  selection: new Set<string>(),
  focusedId: null,

  thumbnailSize: 180,
  showInspector: true,
  showSidebar: true,

  setPhotos: (photos, rootPath) =>
    set({
      photos,
      rootPath,
      states: {},
      selection: new Set(),
      focusedId: photos[0]?.id ?? null,
    }),

  setImporting: (importing) => set({ isImporting: importing }),

  setViewMode: (viewMode) => set({ viewMode }),
  setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setSortAscending: (sortAscending) => set({ sortAscending }),

  setThumbnailSize: (thumbnailSize) => set({ thumbnailSize }),
  toggleInspector: () => set((s) => ({ showInspector: !s.showInspector })),
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),

  setFocused: (focusedId) => set({ focusedId }),

  selectOnly: (id) => set({ selection: new Set([id]), focusedId: id }),

  toggleInSelection: (id) =>
    set((s) => {
      const next = new Set(s.selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selection: next, focusedId: id };
    }),

  extendSelectionTo: (id) =>
    set((s) => {
      const visible = computeFiltered(s);
      const anchor = s.focusedId ?? visible[0]?.id;
      if (!anchor) return { selection: new Set([id]), focusedId: id };
      const i = visible.findIndex((p) => p.id === anchor);
      const j = visible.findIndex((p) => p.id === id);
      if (i < 0 || j < 0) return { selection: new Set([id]), focusedId: id };
      const [lo, hi] = i < j ? [i, j] : [j, i];
      const next = new Set(s.selection);
      for (let k = lo; k <= hi; k += 1) next.add(visible[k].id);
      return { selection: next, focusedId: id };
    }),

  clearSelection: () => set({ selection: new Set() }),

  stateOf: (id) => get().states[id] ?? defaultState,

  setFlagOnTargets: (flag) =>
    set((s) => ({ states: applyToTargets(s, (st) => ({ ...st, flag })) })),

  toggleFlagOnTargets: (flag) =>
    set((s) => ({
      states: applyToTargets(s, (st) => ({
        ...st,
        flag: st.flag === flag ? "unflagged" : flag,
      })),
    })),

  setRatingOnTargets: (rating) => {
    const clamped = Math.max(0, Math.min(5, rating));
    set((s) => ({ states: applyToTargets(s, (st) => ({ ...st, rating: clamped })) }));
  },

  setColorOnTargets: (color) =>
    set((s) => ({ states: applyToTargets(s, (st) => ({ ...st, colorLabel: color })) })),

  navigate: (direction) =>
    set((s) => {
      const visible = computeFiltered(s);
      if (visible.length === 0) return {};
      const i = visible.findIndex((p) => p.id === s.focusedId);
      const next = i < 0 ? 0 : Math.max(0, Math.min(visible.length - 1, i + direction));
      return { focusedId: visible[next].id };
    }),

  filtered: () => computeFiltered(get()),
}));

function applyToTargets(
  s: LibraryState,
  mutator: (st: PhotoState) => PhotoState
): Record<string, PhotoState> {
  const ids =
    s.selection.size > 1
      ? Array.from(s.selection)
      : s.focusedId
      ? [s.focusedId]
      : [];
  if (ids.length === 0) return s.states;
  const next = { ...s.states };
  for (const id of ids) {
    next[id] = mutator(next[id] ?? defaultState);
  }
  return next;
}

function computeFiltered(s: LibraryState): PhotoInfo[] {
  return applyFilter(s.photos, s.states, s.filter, s.sort, s.sortAscending);
}

function matchFilter(_: PhotoInfo, st: PhotoState, filter: Filter): boolean {
  switch (filter.kind) {
    case "all": return true;
    case "pick": return st.flag === "pick";
    case "reject": return st.flag === "reject";
    case "unflagged": return st.flag === "unflagged";
    case "rated": return st.rating >= filter.min;
    case "color": return st.colorLabel === filter.color;
  }
}

export function countBy(state: LibraryState, predicate: (st: PhotoState) => boolean): number {
  let n = 0;
  for (const p of state.photos) {
    if (predicate(state.states[p.id] ?? defaultState)) n += 1;
  }
  return n;
}

export function useFilteredPhotos(): PhotoInfo[] {
  const photos = useLibrary((s) => s.photos);
  const states = useLibrary((s) => s.states);
  const filter = useLibrary((s) => s.filter);
  const sort = useLibrary((s) => s.sort);
  const sortAscending = useLibrary((s) => s.sortAscending);
  return useMemo(
    () => applyFilter(photos, states, filter, sort, sortAscending),
    [photos, states, filter, sort, sortAscending]
  );
}
