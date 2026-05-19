import { useEffect, useState } from "react";
import { generateThumbnail, generatePreview } from "@/lib/ipc";

const inflight = new Map<string, Promise<string>>();

export function useThumbnail(path: string, size: number): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `${path}@${size}`;
    let promise = inflight.get(key);
    if (!promise) {
      promise = generateThumbnail(path, size);
      inflight.set(key, promise);
      promise.finally(() => inflight.delete(key));
    }
    promise
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, size]);

  return url;
}

export function usePreview(path: string | null, maxSize: number): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setUrl(null);
    generatePreview(path, maxSize)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, maxSize]);

  return url;
}
