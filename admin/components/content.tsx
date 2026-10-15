"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import type { AdminPath, AdminPathDetail, AdminLesson, ContentStatus } from "@/lib/types";
import { Badge, Btn, statusTone } from "./ui";

/** Shared pieces for the content pages (paths, lessons, resources, missions…). */

export function usePaths() {
  const { token } = useAuth();
  return useLoad(() => adminApi<AdminPath[]>("/paths", token), [token]);
}

/** Remembers the last path the operator worked on across content pages. */
export function usePathChoice(paths: AdminPath[] | null) {
  const [pathId, setPathId] = useState<string>("");
  useEffect(() => {
    if (!paths?.length || pathId) return;
    let stored = "";
    try { stored = localStorage.getItem("vaulten_admin_path") ?? ""; } catch { /* ignore */ }
    setPathId(paths.some((p) => p.id === stored) ? stored : paths[0].id);
  }, [paths, pathId]);
  const choose = (id: string) => {
    setPathId(id);
    try { localStorage.setItem("vaulten_admin_path", id); } catch { /* ignore */ }
  };
  return [pathId, choose] as const;
}

export function PathSelect({ paths, value, onChange }: { paths: AdminPath[] | null; value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto bg-card font-semibold">
      {!paths?.length && <option value="">No path yet</option>}
      {paths?.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status !== "PUBLISHED" ? ` (${p.status.toLowerCase()})` : ""}</option>)}
    </select>
  );
}

/** Loads a path with its weeks, and every lesson of those weeks (the API lists lessons per week). */
export function usePathLessons(pathId: string) {
  const { token } = useAuth();
  return useLoad(async () => {
    if (!pathId) return { path: null as AdminPathDetail | null, lessons: [] as AdminLesson[] };
    const path = await adminApi<AdminPathDetail>(`/paths/${pathId}`, token);
    const perWeek = await Promise.all(path.weeks.map((w) => adminApi<AdminLesson[]>("/learning/lessons", token, { params: { weekId: w.id } })));
    const order = new Map(path.weeks.map((w, i) => [w.id, i]));
    const lessons = perWeek.flat().sort((a, b) => (order.get(a.weekId)! - order.get(b.weekId)!) || a.position - b.position);
    return { path, lessons };
  }, [token, pathId]);
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={statusTone(status)} dot>{status.toLowerCase()}</Badge>;
}

/** Publish / archive pair for any content entity with a lifecycle. */
export function LifecycleButtons({ status, onPublish, onArchive, disabled, labels = {} }: { status: ContentStatus; onPublish: () => void; onArchive: () => void; disabled?: boolean; labels?: { publish?: string; archive?: string } }) {
  return (
    <>
      {status !== "PUBLISHED" && <Btn tone="success" size="sm" disabled={disabled} onClick={onPublish}>{labels.publish ?? (status === "ARCHIVED" ? "Restore & publish" : "Publish")}</Btn>}
      {status !== "ARCHIVED" && <Btn tone="danger" size="sm" disabled={disabled} onClick={onArchive}>{labels.archive ?? "Archive"}</Btn>}
    </>
  );
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <tr><td colSpan={cols} className="py-10 text-center text-sm text-muted">{children}</td></tr>;
}
