"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi, localApi } from "@/lib/api";
import { LessonVideoPicker } from "@/components/video-picker";
import { useDraft, useLoad, useNotice, num, nz } from "@/lib/hooks";
import type { AdminLesson, Setting } from "@/lib/types";
import { Badge, Btn, Card, DataState, Drawer, Field, Modal, Notice, SearchInput, Toggle, fmtDate } from "@/components/ui";
import { LifecycleButtons, PathSelect, StatusBadge, slugify, usePathChoice, usePathLessons, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

function LessonsInner() {
  const { token, can } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths } = usePaths();
  const [pathId, setPathId] = usePathChoice(paths);
  const [weekId, setWeekId] = useState(sp.get("weekId") ?? "");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(false);
  const openId = sp.get("id");
  const [bulk, setBulk] = useState<{ done: number; total: number; picked: number } | null>(null);
  const aiPickMissing = async () => {
    const todo = rows.filter((l) => !l.videoUrl);
    if (!todo.length || !confirm(`Let the coach AI pick a YouTube video for ${todo.length} lesson(s) without one?`)) return;
    let picked = 0;
    setBulk({ done: 0, total: todo.length, picked });
    for (const [i, l] of todo.entries()) {
      try { const r = await localApi<{ picked: unknown }>("/video-pick", token, undefined, { method: "POST", body: { lessonId: l.id } }); if (r.picked) picked++; } catch (e) { fail(e); break; }
      setBulk({ done: i + 1, total: todo.length, picked });
    }
    ok(`Coach AI attached videos to ${picked} of ${todo.length} lessons.`);
    setBulk(null); reload();
  };
  const editable = can("CONTENT_MANAGER");

  const { data: settings } = useLoad(() => adminApi<Setting[]>("/settings", token), [token]);
  const defaultWatch = Number(settings?.find((s) => s.key === "lessons.minWatchPercent")?.value ?? 50);
  const watchGate = settings?.find((s) => s.key === "lessons.requireWatchToComplete")?.value !== false;

  // A deep link to a week (from the Paths page) also selects its path.
  const { data, loading, error, reload } = usePathLessons(pathId);
  useEffect(() => {
    const w = sp.get("weekId");
    if (w && paths && data?.path && !data.path.weeks.some((x) => x.id === w)) {
      Promise.all(paths.map((p) => adminApi<{ weeks: { id: string }[] }>(`/paths/${p.id}`, token))).then((ds) => { const i = ds.findIndex((d) => d.weeks.some((x) => x.id === w)); if (i >= 0) setPathId(paths[i].id); });
    }
  }, [sp, paths, data?.path, token, setPathId]);

  const rows = useMemo(() => (data?.lessons ?? []).filter((l) => (!weekId || l.weekId === weekId) && (!status || l.status === status) && (!q || l.title.toLowerCase().includes(q.toLowerCase()) || l.slug.includes(q.toLowerCase()))), [data, weekId, status, q]);
  const weekOf = (id: string) => data?.path?.weeks.find((w) => w.id === id);
  const setOpen = (id: string | null) => { const n = new URLSearchParams(sp.toString()); if (id) n.set("id", id); else n.delete("id"); router.replace(`/lessons?${n.toString()}`); };

  return (
    <>
      <Topbar title="Lessons" subtitle="Video lessons per week. The watch rule decides when a lesson counts as done." pill={data ? `${data.lessons.length} lessons` : undefined} actions={editable && <div className="flex gap-2"><Btn size="sm" disabled={!!bulk || !rows.some((l) => !l.videoUrl)} onClick={aiPickMissing}>{bulk ? `AI picking ${bulk.done}/${bulk.total}…` : "AI-pick missing videos"}</Btn><Btn solid size="sm" onClick={() => setCreate(true)} disabled={!data?.path?.weeks.length}><Icon name="plus" className="w-3.5 h-3.5" /> New lesson</Btn></div>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <div className="rounded-xl border border-line bg-primary-light/50 px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="font-semibold text-primary-text"><Icon name="video" className="w-4 h-4 inline -mt-0.5 mr-1" />Watch rule</span>
        <span className="text-fg">{watchGate ? <>Users must watch <b>{defaultWatch}%</b> of a video before completing the lesson or skipping its mission step.</> : <>Watch gate is <b>off</b>: lessons complete without watching.</>}</span>
        <a href="/settings" className="text-primary-text text-xs font-semibold ml-auto">Change default →</a>
      </div>
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <PathSelect paths={paths} value={pathId} onChange={(v) => { setPathId(v); setWeekId(""); }} />
          <select className="input w-auto bg-card" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
            <option value="">All weeks</option>
            {data?.path?.weeks.map((w) => <option key={w.id} value={w.id}>Week {w.number} · {w.title}</option>)}
          </select>
          <select className="input w-auto bg-card" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
          <SearchInput value={q} onChange={setQ} placeholder="Title or slug" className="w-60" />
        </div>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyLabel="No lesson matches.">
          <table className="data w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-2 font-semibold">Lesson</th><th className="px-3 py-2 font-semibold">Week</th><th className="px-3 py-2 font-semibold">Video</th><th className="px-3 py-2 font-semibold">Watch rule</th><th className="px-3 py-2 font-semibold">XP</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-5 py-2 font-semibold text-right">Updated</th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} onClick={() => setOpen(l.id)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                  <td className="px-5 py-3"><p className="font-semibold text-fg">{l.title}</p><p className="text-xs text-muted truncate max-w-[380px]">{l.summary}</p></td>
                  <td className="px-3 py-3 text-muted whitespace-nowrap">W{weekOf(l.weekId)?.number ?? "?"} · #{l.position + 1}</td>
                  <td className="px-3 py-3 text-muted whitespace-nowrap">{l.videoUrl ? <span className="inline-flex items-center gap-1"><Icon name="play" className="w-3.5 h-3.5 text-success" />{l.durationMinutes ? `${l.durationMinutes} min` : "video"}</span> : <span className="text-faint">no video</span>}</td>
                  <td className="px-3 py-3">{!l.videoUrl || !watchGate ? <span className="text-faint text-xs">—</span> : l.minWatchPercent != null ? <Badge tone="warning">{l.minWatchPercent}% override</Badge> : <Badge tone="neutral">{defaultWatch}% default</Badge>}</td>
                  <td className="px-3 py-3 tabular-nums">{l.xpReward}</td>
                  <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3 text-right text-muted whitespace-nowrap">{fmtDate(l.updatedAt, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Card>
      {openId && <LessonDrawer id={openId} weeks={data?.path?.weeks ?? []} defaultWatch={defaultWatch} editable={editable} onClose={() => setOpen(null)} onChanged={(m) => { ok(m); reload(); }} onError={fail} />}
      {data?.path && <CreateLessonModal open={create} pathId={pathId} weeks={data.path.weeks} defaultWeekId={weekId} onClose={() => setCreate(false)} onCreated={(l) => { setCreate(false); ok("Lesson created as draft"); reload(); setOpen(l.id); }} onError={fail} />}
    </>
  );
}

export default function LessonsPage() {
  return <Suspense fallback={null}><LessonsInner /></Suspense>;
}

type LessonDraft = { title: string; summary: string; content: string; videoUrl: string; durationMinutes: string; xpReward: number; position: number; weekId: string; minWatchPercent: number | null };

function LessonDrawer({ id, weeks, defaultWatch, editable, onClose, onChanged, onError }: { id: string; weeks: { id: string; number: number; title: string }[]; defaultWatch: number; editable: boolean; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminLesson>(`/learning/lessons/${id}`, token), [token, id]);
  const draft = useDraft<LessonDraft>(data ? { title: data.title, summary: data.summary, content: data.content, videoUrl: data.videoUrl ?? "", durationMinutes: data.durationMinutes?.toString() ?? "", xpReward: data.xpReward, position: data.position, weekId: data.weekId, minWatchPercent: data.minWatchPercent ?? null } : null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); reload(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const save = () => {
    const c = draft.changed();
    const body: Record<string, unknown> = { ...c };
    if ("videoUrl" in c) body.videoUrl = nz(c.videoUrl!);
    if ("durationMinutes" in c) body.durationMinutes = num(c.durationMinutes!);
    return run("Lesson saved", () => adminApi(`/learning/lessons/${id}`, token, { method: "PATCH", body }));
  };
  const d = draft.draft;
  return (
    <Drawer open onClose={onClose} title={data?.title ?? "Lesson"} dirty={draft.dirty} footer={data && editable && (
      <>
        <Btn solid disabled={!draft.dirty || busy} onClick={save}>Save{draft.dirty ? ` (${draft.dirtyCount})` : ""}</Btn>
        {draft.dirty && <Btn tone="neutral" onClick={draft.reset}>Discard</Btn>}
        <div className="ml-auto flex gap-2"><LifecycleButtons status={data.status} disabled={busy} onPublish={() => run("Lesson published", () => adminApi(`/learning/lessons/${id}/publish`, token, { method: "POST" }))} onArchive={() => run("Lesson archived", () => adminApi(`/learning/lessons/${id}/archive`, token, { method: "POST" }))} /></div>
      </>
    )}>
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && d && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap"><StatusBadge status={data.status} /><code className="text-xs text-faint font-mono">{data.slug}</code>{data.instructor && <span className="text-xs text-muted">· {data.instructor}</span>}<span className="text-xs text-faint">· updated {fmtDate(data.updatedAt)}</span></div>
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-fg">Content</h3>
              <Field label="Title"><input className="input" value={d.title} onChange={(e) => draft.set("title", e.target.value)} disabled={!editable} /></Field>
              <Field label="Summary" hint="Shown on the lesson card."><textarea className="input min-h-[70px]" value={d.summary} onChange={(e) => draft.set("summary", e.target.value)} disabled={!editable} /></Field>
              <Field label={<span className="flex items-center gap-3">Body (Markdown) <button type="button" onClick={() => setPreview(!preview)} className="text-xs text-primary-text cursor-pointer">{preview ? "edit" : "preview"}</button></span>}>
                {preview ? <div className="rounded-xl border border-line bg-sunken p-4 text-sm whitespace-pre-wrap min-h-[200px]">{d.content}</div> : <textarea className="input min-h-[220px] font-mono text-xs" value={d.content} onChange={(e) => draft.set("content", e.target.value)} disabled={!editable} />}
              </Field>
            </section>
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-fg">Video & completion</h3>
              <Field label="Lesson video" hint="Pick the best YouTube video for this lesson. Users must watch the share set below before they can skip the step.">
                <LessonVideoPicker lessonId={id} token={token} videoUrl={data.videoUrl} snapshot={data.videoSnapshot} defaultQuery={data.title} editable={editable} onChanged={(m) => { onChanged(m); reload(); }} onError={onError} />
              </Field>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Duration (min)"><input className="input" type="number" min={0} value={d.durationMinutes} onChange={(e) => draft.set("durationMinutes", e.target.value)} disabled={!editable} /></Field>
                <Field label="XP reward"><input className="input" type="number" min={0} value={d.xpReward} onChange={(e) => draft.set("xpReward", Number(e.target.value))} disabled={!editable} /></Field>
                <Field label="Position in week"><input className="input" type="number" min={0} value={d.position} onChange={(e) => draft.set("position", Number(e.target.value))} disabled={!editable} /></Field>
              </div>
              <Field label="Week"><select className="input" value={d.weekId} onChange={(e) => draft.set("weekId", e.target.value)} disabled={!editable}>{weeks.map((w) => <option key={w.id} value={w.id}>Week {w.number} · {w.title}</option>)}</select></Field>
              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-fg">Minimum watched to complete / skip</p>
                    <p className="text-xs text-muted">Below this share of the video the app refuses “Mark complete” and “Skip” on the mission step that links to this lesson.</p>
                  </div>
                  <span className="text-xs text-muted">Override</span>
                  <Toggle checked={d.minWatchPercent != null} disabled={!editable} onChange={(v) => draft.set("minWatchPercent", v ? defaultWatch : null)} label="Override watch rule" />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <input type="range" min={0} max={100} step={5} value={d.minWatchPercent ?? defaultWatch} disabled={!editable || d.minWatchPercent == null} onChange={(e) => draft.set("minWatchPercent", Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" />
                  <span className="w-28 text-right text-sm font-bold tabular-nums">{d.minWatchPercent ?? defaultWatch}% {d.minWatchPercent == null && <span className="text-xs font-normal text-muted">(default)</span>}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </DataState>
    </Drawer>
  );
}

function CreateLessonModal({ open, pathId, weeks, defaultWeekId, onClose, onCreated, onError }: { open: boolean; pathId: string; weeks: { id: string; number: number; title: string }[]; defaultWeekId: string; onClose: () => void; onCreated: (l: AdminLesson) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState({ title: "", slug: "", summary: "", weekId: defaultWeekId || weeks[0]?.id || "", videoUrl: "", durationMinutes: "", xpReward: 25 });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV((x) => ({ ...x, weekId: defaultWeekId || weeks[0]?.id || "" })); }, [open, defaultWeekId, weeks]);
  return (
    <Modal open={open} onClose={onClose} title="New lesson">
      <div className="space-y-3">
        <Field label="Title"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value, slug: slugify(e.target.value) })} autoFocus /></Field>
        <Field label="Slug" hint="Unique within the path."><input className="input font-mono" value={v.slug} onChange={(e) => setV({ ...v, slug: slugify(e.target.value) })} /></Field>
        <Field label="Week"><select className="input" value={v.weekId} onChange={(e) => setV({ ...v, weekId: e.target.value })}>{weeks.map((w) => <option key={w.id} value={w.id}>Week {w.number} · {w.title}</option>)}</select></Field>
        <Field label="Summary"><textarea className="input min-h-[60px]" value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
        <div className="grid grid-cols-[1fr_90px_90px] gap-3">
          <Field label="Video URL"><input className="input" value={v.videoUrl} onChange={(e) => setV({ ...v, videoUrl: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Minutes"><input className="input" type="number" value={v.durationMinutes} onChange={(e) => setV({ ...v, durationMinutes: e.target.value })} /></Field>
          <Field label="XP"><input className="input" type="number" value={v.xpReward} onChange={(e) => setV({ ...v, xpReward: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex gap-2 pt-2"><Btn solid disabled={!v.title || !v.slug || !v.weekId || !v.summary || busy} onClick={async () => { setBusy(true); try { onCreated(await adminApi<AdminLesson>("/learning/lessons", token, { method: "POST", body: { pathId, weekId: v.weekId, slug: v.slug, title: v.title, summary: v.summary, content: "", videoUrl: nz(v.videoUrl), durationMinutes: num(v.durationMinutes), xpReward: v.xpReward } })); } catch (e) { onError(e); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}
