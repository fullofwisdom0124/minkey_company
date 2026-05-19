import clsx from "clsx";
import { useLibrary, countBy } from "@/store/library";
import { COLOR_HEX, COLOR_LABELS, type ColorLabel, type Filter } from "@/types/photo";

interface RowProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function Row({ label, count, icon, active, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition",
        active
          ? "bg-blue-500/90 text-white"
          : "text-chrome-100 hover:bg-white/5"
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span
        className={clsx(
          "tabular-nums text-[11px]",
          active ? "text-white/80" : "text-chrome-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-4 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-chrome-400">
      {label}
    </div>
  );
}

function filterEquals(a: Filter, b: Filter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "rated" && b.kind === "rated") return a.min === b.min;
  if (a.kind === "color" && b.kind === "color") return a.color === b.color;
  return true;
}

export function Sidebar() {
  const filter = useLibrary((s) => s.filter);
  const setFilter = useLibrary((s) => s.setFilter);
  const total = useLibrary((s) => s.photos.length);
  const state = useLibrary((s) => s);

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto px-2 py-3">
      <SectionHeader label="Library" />
      <Row
        label="All Photos"
        count={total}
        icon={<span className="text-chrome-300">▦</span>}
        active={filter.kind === "all"}
        onClick={() => setFilter({ kind: "all" })}
      />
      <Row
        label="Picked"
        count={countBy(state, (st) => st.flag === "pick")}
        icon={<FlagIcon color="#32d74b" />}
        active={filter.kind === "pick"}
        onClick={() => setFilter({ kind: "pick" })}
      />
      <Row
        label="Rejected"
        count={countBy(state, (st) => st.flag === "reject")}
        icon={<FlagIcon color="#ff453a" slashed />}
        active={filter.kind === "reject"}
        onClick={() => setFilter({ kind: "reject" })}
      />
      <Row
        label="Unflagged"
        count={countBy(state, (st) => st.flag === "unflagged")}
        icon={<FlagIcon color="#8e8e93" outline />}
        active={filter.kind === "unflagged"}
        onClick={() => setFilter({ kind: "unflagged" })}
      />

      <SectionHeader label="Ratings" />
      {[5, 4, 3, 2, 1].map((stars) => {
        const f: Filter = { kind: "rated", min: stars };
        return (
          <Row
            key={stars}
            label={"★".repeat(stars) + "☆".repeat(5 - stars)}
            count={countBy(state, (st) => st.rating >= stars)}
            icon={<span className="text-yellow-400">★</span>}
            active={filterEquals(filter, f)}
            onClick={() => setFilter(f)}
          />
        );
      })}

      <SectionHeader label="Color Labels" />
      {COLOR_LABELS.map((c) => {
        const f: Filter = { kind: "color", color: c };
        return (
          <Row
            key={c}
            label={c[0].toUpperCase() + c.slice(1)}
            count={countBy(state, (st) => st.colorLabel === c)}
            icon={<ColorDot color={c} />}
            active={filterEquals(filter, f)}
            onClick={() => setFilter(f)}
          />
        );
      })}
    </aside>
  );
}

function FlagIcon({
  color,
  slashed,
  outline,
}: {
  color: string;
  slashed?: boolean;
  outline?: boolean;
}) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path
        d="M3.5 2v12M3.5 2h8l-2 3 2 3h-8"
        stroke={color}
        strokeWidth="1.5"
        fill={outline ? "none" : color}
        strokeLinejoin="round"
      />
      {slashed && (
        <path d="M1 1 L15 15" stroke={color} strokeWidth="1.5" />
      )}
    </svg>
  );
}

function ColorDot({ color }: { color: ColorLabel }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: COLOR_HEX[color] }}
    />
  );
}
