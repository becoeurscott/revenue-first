"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

/** Fetch helper with loading / error / reload; every fetch ends in data or an error. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const reload = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (id === seq.current) setData(d);
      })
      .catch((e) => {
        if (id === seq.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => reload(), [reload]);
  return { data, setData, loading, error, reload };
}

/** Tracks a draft against its source; `patch()` is only the changed keys. */
export function useDraft<T extends Record<string, unknown>>(source: T | null) {
  const [draft, setDraft] = useState<T | null>(source);
  // Callers build `source` inline on every render; only reset the draft when its content changes.
  const sourceKey = JSON.stringify(source);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(source), [sourceKey]);
  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d)), []);
  const changed = (): Partial<T> => {
    if (!draft || !source) return {};
    const out: Partial<T> = {};
    for (const k of Object.keys(draft) as (keyof T)[]) {
      if (JSON.stringify(draft[k]) !== JSON.stringify(source[k])) out[k] = draft[k];
    }
    return out;
  };
  const dirtyCount = Object.keys(changed()).length;
  return { draft, set, setDraft, changed, dirtyCount, dirty: dirtyCount > 0, reset: () => setDraft(source) };
}

/** Nullable strings: empty input → null. */
export const nz = (v: string) => (v.trim() === "" ? null : v);
export const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function useNotice() {
  const [notice, setNotice] = useState<{ kind: "success" | "danger" | "info"; text: string } | null>(null);
  const ok = useCallback((text: string) => setNotice({ kind: "success", text }), []);
  const fail = useCallback((e: unknown) => setNotice({ kind: "danger", text: errorMessage(e) }), []);
  const clear = useCallback(() => setNotice(null), []);
  return { notice, ok, fail, clear };
}
