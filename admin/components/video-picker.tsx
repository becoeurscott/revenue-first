"use client";
import { useState } from "react";
import { adminApi, localApi } from "@/lib/api";
import type { VideoCandidate, VideoSnapshot } from "@/lib/types";
import { Btn } from "@/components/ui";
import { Icon } from "@/components/Icon";

const dur = (s: number) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`; };

/** Curated lesson video: search YouTube via GET /admin/videos, attach with PUT /admin/learning/lessons/:id/video. */
export function LessonVideoPicker({ lessonId, token, videoUrl, snapshot, defaultQuery, editable, onChanged, onError }: {
  lessonId: string; token: string | null; videoUrl: string | null; snapshot?: VideoSnapshot | null; defaultQuery: string; editable: boolean;
  onChanged: (label: string) => void; onError: (e: unknown) => void;
}) {
  const [q, setQ] = useState(defaultQuery);
  const [results, setResults] = useState<VideoCandidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const search = async () => { if (!q.trim()) return; setBusy(true); try { setResults(await adminApi<VideoCandidate[]>("/videos", token, { params: { q: q.trim().slice(0, 200) } })); } catch (e) { onError(e); } finally { setBusy(false); } };
  const attach = async (url: string | null) => { setBusy(true); try { await adminApi(`/learning/lessons/${lessonId}/video`, token, { method: "PUT", body: { url } }); setResults(null); setPaste(""); onChanged(url ? "Video attached" : "Video removed"); } catch (e) { onError(e); } finally { setBusy(false); } };
  const [aiNote, setAiNote] = useState<string | null>(null);
  const aiPick = async () => {
    setBusy(true); setAiNote(null);
    try {
      const r = await localApi<{ picked: VideoCandidate | null; reason: string; considered: number }>("/video-pick", token, undefined, { method: "POST", body: { lessonId } });
      setAiNote(r.picked ? `Picked "${r.picked.title}": ${r.reason}` : `No good match among ${r.considered} videos: ${r.reason}`);
      if (r.picked) onChanged("Coach AI picked a video");
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  const idOf = (u: string) => u.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? null;

  return (
    <div className="space-y-3">
      {videoUrl ? (
        <div className="flex gap-3 rounded-xl border border-line bg-sunken p-3">
          {snapshot?.thumbnailUrl ? <img src={snapshot.thumbnailUrl} alt="" className="w-36 aspect-video rounded-lg object-cover shrink-0" /> : <div className="w-36 aspect-video rounded-lg bg-line shrink-0 grid place-items-center"><Icon name="play" /></div>}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-fg line-clamp-2">{snapshot?.title ?? videoUrl}</div>
            {snapshot && <div className="text-xs text-muted mt-0.5">{snapshot.channelTitle} · {dur(snapshot.durationSeconds)}</div>}
            <div className="flex gap-3 mt-2 text-xs">
              <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-text"><Icon name="external" className="w-3.5 h-3.5" />open</a>
              {editable && <button type="button" disabled={busy} onClick={() => attach(null)} className="text-danger cursor-pointer">Remove</button>}
            </div>
          </div>
        </div>
      ) : <p className="text-xs text-muted">No video picked. The app falls back to the automatic YouTube suggestions for the topic.</p>}

      {editable && (
        <>
          <div className="flex items-center gap-3">
            <Btn solid disabled={busy} onClick={aiPick}>{busy ? "Working…" : videoUrl ? "Let the coach AI re-pick" : "Let the coach AI pick"}</Btn>
            <span className="text-xs text-muted">Searches YouTube and chooses the best fit for this lesson.</span>
          </div>
          {aiNote && <p className="text-xs rounded-lg bg-sunken border border-line p-2 text-fg">{aiNote}</p>}
          <div className="flex gap-2">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search YouTube…" maxLength={200} />
            <Btn solid disabled={busy || !q.trim()} onClick={search}>{busy ? "…" : "Search"}</Btn>
          </div>
          <div className="flex gap-2">
            <input className="input" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="…or paste a YouTube link" />
            <Btn tone="neutral" disabled={busy || !idOf(paste)} onClick={() => attach(paste.trim())}>Attach</Btn>
          </div>
          {results && (results.length === 0 ? <p className="text-xs text-muted">No videos found.</p> : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto">
              {results.map((v) => (
                <li key={v.videoId} className="rounded-xl border border-line p-2">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setPreview(preview === v.videoId ? null : v.videoId)} className="relative w-32 aspect-video shrink-0 cursor-pointer">
                      <img src={v.thumbnailUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white tabular-nums">{dur(v.durationSeconds)}</span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg line-clamp-2">{v.title}</div>
                      <div className="text-xs text-muted">{v.channelTitle}</div>
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <button type="button" onClick={() => setPreview(preview === v.videoId ? null : v.videoId)} className="text-primary-text cursor-pointer">{preview === v.videoId ? "Hide preview" : "Preview"}</button>
                        <button type="button" disabled={busy || v.url === videoUrl} onClick={() => attach(v.url)} className="font-semibold text-success cursor-pointer disabled:opacity-50">{v.url === videoUrl ? "Attached" : "Use this video"}</button>
                      </div>
                    </div>
                  </div>
                  {preview === v.videoId && <iframe className="mt-2 w-full aspect-video rounded-lg" src={`https://www.youtube-nocookie.com/embed/${v.videoId}`} allow="encrypted-media; picture-in-picture" allowFullScreen />}
                </li>
              ))}
            </ul>
          ))}
        </>
      )}
    </div>
  );
}
