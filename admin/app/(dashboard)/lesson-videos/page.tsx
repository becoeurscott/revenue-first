"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useNotice } from "@/lib/hooks";
import { Badge, Btn, Card, Notice, SearchInput } from "@/components/ui";
import APP_LESSONS from "@/lib/app-lessons.json";

/** Stored YouTube video per app lesson (spec: docs/api/lesson-videos.md). The app plays these and spends no YouTube quota. */
interface AppLesson { id: string; title: string; category: string; summary: string; learn: string[]; journey: string }
interface StoredVideo { lessonKey: string; videoId: string; title: string; channelTitle: string; thumbnailUrl: string; durationSeconds: number; source: "ai" | "admin"; reason?: string | null; pickedAt?: string; checkedAt?: string }

const lessons = APP_LESSONS as AppLesson[];
const journeys = Array.from(new Set(lessons.map((l) => l.journey)));
const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function LessonVideosPage() {
  const { token, can } = useAuth();
  const editable = can("CONTENT_MANAGER");
  const { notice, ok, fail, clear } = useNotice();
  const [videos, setVideos] = useState<Record<string, StoredVideo>>({});
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [journey, setJourney] = useState("");
  const [filter, setFilter] = useState<"" | "none" | "ai" | "admin">("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [paste, setPaste] = useState<{ key: string; url: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const load = async () => {
    try {
      const rows = await adminApi<StoredVideo[]>("/lesson-videos", token);
      setVideos(Object.fromEntries(rows.map((r) => [r.lessonKey, r])));
      setState("ready");
    } catch (e) {
      const status = (e as { status?: number }).status;
      setState(status === 404 ? "missing" : "error");
      if (status !== 404) fail(e);
    }
  };
  useEffect(() => { if (token) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => lessons.filter((l) => {
    const v = videos[l.id];
    return (!journey || l.journey === journey)
      && (!filter || (filter === "none" ? !v : v?.source === filter))
      && (!q || `${l.title} ${l.id} ${v?.title ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  }), [videos, journey, filter, q]);
  const filled = lessons.filter((l) => videos[l.id]).length;

  const aiPick = async (l: AppLesson, force = false) => {
    setBusy(l.id);
    try {
      const r = await adminApi<{ picked: StoredVideo | null; reason: string; replaced: boolean }>(`/lesson-videos/${l.id}/ai-pick`, token, {
        method: "POST", body: { lesson: { title: l.title, category: l.category, summary: l.summary, learn: l.learn }, force },
      });
      if (r.picked) { setVideos((v) => ({ ...v, [l.id]: { ...r.picked!, lessonKey: l.id } })); ok(`${r.replaced ? "Replaced" : "Kept/picked"}: ${r.picked.title}. ${r.reason}`); }
      else ok(`No good video found for "${l.title}". ${r.reason}`);
      return !!r.picked;
    } catch (e) { fail(e); throw e; } finally { setBusy(null); }
  };
  const attach = async (key: string, url: string) => {
    setBusy(key);
    try {
      const r = await adminApi<StoredVideo>(`/lesson-videos/${key}`, token, { method: "PUT", body: { url } });
      setVideos((v) => ({ ...v, [key]: { ...r, lessonKey: key } })); setPaste(null); ok("Video set. The AI will not replace it.");
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const remove = async (key: string) => {
    if (!confirm("Remove this video? The AI may pick a new one on its next run.")) return;
    setBusy(key);
    try { await adminApi(`/lesson-videos/${key}`, token, { method: "DELETE" }); setVideos((v) => { const n = { ...v }; delete n[key]; return n; }); ok("Video removed."); }
    catch (e) { fail(e); } finally { setBusy(null); }
  };
  const pickMissing = async () => {
    const todo = rows.filter((l) => !videos[l.id]);
    if (!todo.length || !confirm(`Let the coach AI pick videos for ${todo.length} lesson(s)? Each pick uses about 1% of the daily YouTube quota.`)) return;
    setBulk({ done: 0, total: todo.length });
    for (const [i, l] of todo.entries()) {
      try { await aiPick(l); } catch { break; }
      setBulk({ done: i + 1, total: todo.length });
    }
    setBulk(null);
  };

  return (
    <>
      <Topbar title="Lesson videos" subtitle="The YouTube video each app lesson plays. Coach AI picks them; you can override any of them." pill={state === "ready" ? `${filled}/${lessons.length} with video` : undefined}
        actions={editable && state === "ready" && <Btn size="sm" disabled={!!bulk || !rows.some((l) => !videos[l.id])} onClick={pickMissing}>{bulk ? `AI picking ${bulk.done}/${bulk.total}…` : "AI-pick missing (shown)"}</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      {state === "missing" && <div className="mb-4"><Notice kind="info">The backend does not have the lesson-videos endpoints yet (spec: docs/api/lesson-videos.md). Until it does, the app finds videos with its own filtered YouTube search, and nothing here can be saved.</Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <select className="input w-auto bg-card" value={journey} onChange={(e) => setJourney(e.target.value)}>
            <option value="">All journeys</option>{journeys.map((j) => <option key={j}>{j}</option>)}
          </select>
          <select className="input w-auto bg-card" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="">Any video</option><option value="none">No video</option><option value="ai">Picked by AI</option><option value="admin">Set by admin</option>
          </select>
          <SearchInput value={q} onChange={setQ} placeholder="Lesson, id or video title" className="w-64" />
          <span className="text-xs text-faint ml-auto">{rows.length} lessons</span>
        </div>
        <table className="data w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-2 font-semibold">Lesson</th><th className="px-3 py-2 font-semibold">Video</th><th className="px-5 py-2 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((l) => {
              const v = videos[l.id];
              return (
                <tr key={l.id} className="border-t border-line align-top">
                  <td className="px-5 py-3 w-[34%]">
                    <div className="font-semibold text-fg">{l.title}</div>
                    <div className="text-xs text-faint">{l.journey} · {l.category} · <code>{l.id}</code></div>
                  </td>
                  <td className="px-3 py-3">
                    {v ? (
                      <div className="flex gap-3">
                        <button className="relative shrink-0" onClick={() => setPreview(preview === l.id ? null : l.id)} title="Preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.thumbnailUrl} alt="" className="w-32 aspect-video object-cover rounded-md" />
                          <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/75 text-white px-1 rounded">{fmtLen(v.durationSeconds)}</span>
                        </button>
                        <div className="min-w-0">
                          <div className="font-medium text-fg line-clamp-2">{v.title}</div>
                          <div className="text-xs text-faint">{v.channelTitle}</div>
                          <div className="mt-1 flex items-center gap-2"><Badge tone={v.source === "admin" ? "info" : "primary"}>{v.source === "admin" ? "Set by admin" : "Coach AI"}</Badge>{v.reason && <span className="text-xs text-faint line-clamp-1" title={v.reason}>{v.reason}</span>}</div>
                        </div>
                      </div>
                    ) : <span className="text-xs text-faint">No video. The app falls back to search.</span>}
                    {preview === l.id && v && <iframe className="mt-3 w-full max-w-md aspect-video rounded-md" src={`https://www.youtube-nocookie.com/embed/${v.videoId}`} allow="encrypted-media; picture-in-picture" allowFullScreen />}
                    {paste?.key === l.id && (
                      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); attach(l.id, paste.url); }}>
                        <input autoFocus className="input flex-1" placeholder="https://www.youtube.com/watch?v=…" value={paste.url} onChange={(e) => setPaste({ key: l.id, url: e.target.value })} />
                        <Btn solid size="sm" type="submit" disabled={!paste.url || busy === l.id}>Save</Btn>
                        <Btn size="sm" tone="neutral" onClick={() => setPaste(null)}>Cancel</Btn>
                      </form>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {editable && state === "ready" && (
                      <div className="flex justify-end gap-1.5">
                        <Btn size="xs" disabled={busy === l.id || !!bulk} onClick={() => aiPick(l, v?.source === "admin" && confirm("This video was set by an admin. Let the AI replace it if it finds a better one?")).catch(() => {})}>{busy === l.id ? "Working…" : v ? "AI re-pick" : "AI pick"}</Btn>
                        <Btn size="xs" tone="neutral" onClick={() => setPaste({ key: l.id, url: "" })}>Paste link</Btn>
                        {v && <Btn size="xs" tone="danger" disabled={busy === l.id} onClick={() => remove(l.id)}>Remove</Btn>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
