import { useEffect } from "react";

export interface KeyBinding {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
}

export function useKeyboard(bindings: KeyBinding[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      for (const b of bindings) {
        if (e.key !== b.key) continue;
        if (!!b.meta !== (e.metaKey || e.ctrlKey)) continue;
        if (!!b.shift !== e.shiftKey) continue;
        if (!!b.alt !== e.altKey) continue;
        e.preventDefault();
        b.action();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings]);
}
