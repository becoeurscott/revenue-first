"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useDraft, useLoad, useNotice } from "@/lib/hooks";
import type { AdminMissionDay, AdminMissionPlan, AdminMissionTask, AdminResource, MissionTaskType, Setting } from "@/lib/types";
import { TASK_TYPES } from "@/lib/types";
import { Badge, Btn, Card, DataState, Drawer, Field, Modal, Notice, Toggle, fmtDate } from "@/components/ui";
import { LifecycleButtons, PathSelect, StatusBadge, usePathChoice, usePathLessons, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

const TYPE_TONE: Record<MissionTaskType, "primary" | "accent" | "success" | "warning" | "info"> = { ACTION: "primary", LESSON: "info", RESOURCE: "accent", PROSPECTING: "success", REFLECTION: "warning" };

export default function MissionsPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths } = usePaths();
  const [pathId, setPathId] = usePathChoice(paths);
  const [planId, setPlanId] = useState("");
  const [create, setCreate] = useState(false);
  const editable = can("CONTENT_MANAGER");
  const { data: plans, loading, error, reload } = useLoad(() => (pathId ? adminApi<AdminMissionPlan[]>("/missions/plans", token, { params: { pathId } }) : Promise.resolve([] as AdminMissionPlan[])), [token, pathId]);
  useEffect(() => { if (plans && !plans.some((p) => p.id === planId)) setPlanId(plans.find((p) => p.status === "PUBLISHED")?.id ?? plans[0]?.id ?? ""); }, [plans, planId]);

  return (
    <>
      <Topbar title="Mission plans" subtitle="The day-by-day program. One published plan per path; new users start on it." pill={plans ? `${plans.length} plans` : undefined} actions={editable && <Btn solid size="sm" onClick={() => setCreate(true)} disabled={!pathId}><Icon name="plus" className="w-3.5 h-3.5" /> New plan</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <PathSelect paths={paths} value={pathId} onChange={(v) => { setPathId(v); setPlanId(""); }} />
        <DataState loading={loading && !plans} error={error} onRetry={reload} minHeight="min-h-[40px]">
          <div className="flex flex-wrap gap-2">{plans?.map((p) => <button key={p.id} onClick={() => setPlanId(p.id)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${planId === p.id ? "border-primary bg-primary-light text-primary-text" : "border-line bg-card text-muted hover:text-fg"}`}>{p.title} <span className="opacity-70">· {p.status.toLowerCase()} · {p.durationDays} d</span></button>)}{plans?.length === 0 && <span className="text-sm text-muted">No plan for this path yet.</span>}</div>
        </DataState>
      </div>
      {planId && <PlanEditor id={planId} pathId={pathId} editable={editable} onChanged={(m) => { ok(m); reload(); }} onError={fail} />}
      <CreatePlanModal open={create} pathId={pathId} onClose={() => setCreate(false)} onCreated={(p) => { setCreate(false); ok("Plan created as draft"); reload(); setPlanId(p.id); }} onError={fail} />
    </>
  );
}

function PlanEditor({ id, pathId, editable, onChanged, onError }: { id: string; pathId: string; editable: boolean; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const { data: plan, loading, error, reload } = useLoad(() => adminApi<AdminMissionPlan>(`/missions/plans/${id}`, token), [token, id]);
  const { data: pl } = usePathLessons(pathId);
  const { data: resources } = useLoad(() => (pathId ? adminApi<AdminResource[]>("/learning/resources", token, { params: { pathId } }) : Promise.resolve([] as AdminResource[])), [token, pathId]);
  const { data: settings } = useLoad(() => adminApi<Setting[]>("/settings", token), [token]);
  const defaultWatch = Number(settings?.find((s) => s.key === "lessons.minWatchPercent")?.value ?? 50);
  const draft = useDraft<{ title: string; description: string }>(plan ? { title: plan.title, description: plan.description } : null);
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(1);
  const [addDay, setAddDay] = useState(false);
  const [task, setTask] = useState<{ day: AdminMissionDay; task: AdminMissionTask | null } | null>(null);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); reload(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const lessonOf = (lid: string | null) => pl?.lessons.find((l) => l.id === lid);
  const resourceOf = (rid: string | null) => resources?.find((r) => r.id === rid);

  return (
    <DataState loading={loading && !plan} error={error} onRetry={reload} minHeight="min-h-[300px]">
      {plan && draft.draft && (
        <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
          <div className="space-y-3">
            {[...plan.days].sort((a, b) => a.dayNumber - b.dayNumber).map((day) => {
              const open = openDay === day.dayNumber;
              const live = day.tasks.filter((t) => t.status !== "ARCHIVED");
              return (
                <Card key={day.id} pad={false}>
                  <button onClick={() => setOpenDay(open ? null : day.dayNumber)} className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer">
                    <span className="w-11 h-11 rounded-xl bg-primary-light text-primary-text grid place-items-center font-bold text-sm shrink-0">D{day.dayNumber}</span>
                    <div className="min-w-0 flex-1"><p className="font-semibold text-fg truncate">{day.title}</p><p className="text-xs text-muted truncate">{day.objective}</p></div>
                    <span className="text-xs text-muted whitespace-nowrap">{live.length} task{live.length === 1 ? "" : "s"} · {live.reduce((s, t) => s + t.xpReward, 0)} XP</span>
                    <Icon name="chevron" className={`w-4 h-4 text-faint transition ${open ? "rotate-90" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 border-t border-line pt-4 space-y-3">
                      <DayForm day={day} editable={editable} onSaved={(m) => { onChanged(m); reload(); }} onError={onError} />
                      <div className="rounded-xl border border-line overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint bg-sunken/60"><th className="px-3 py-2 font-semibold">#</th><th className="px-3 py-2 font-semibold">Task</th><th className="px-3 py-2 font-semibold">Type</th><th className="px-3 py-2 font-semibold">Linked</th><th className="px-3 py-2 font-semibold">XP</th><th className="px-3 py-2 font-semibold">Required</th><th className="px-3 py-2 font-semibold">Status</th></tr></thead>
                          <tbody>
                            {[...day.tasks].sort((a, b) => a.position - b.position).map((t) => {
                              const les = lessonOf(t.linkedLessonId);
                              const gate = t.type === "LESSON" && les?.videoUrl ? (les.minWatchPercent ?? defaultWatch) : null;
                              return (
                                <tr key={t.id} onClick={() => setTask({ day, task: t })} className={`border-t border-line hover:bg-sunken/60 cursor-pointer ${t.status === "ARCHIVED" ? "opacity-50" : ""}`}>
                                  <td className="px-3 py-2.5 text-muted">{t.position + 1}</td>
                                  <td className="px-3 py-2.5"><p className="font-medium text-fg">{t.title}</p><p className="text-xs text-muted line-clamp-1">{t.description}</p></td>
                                  <td className="px-3 py-2.5"><Badge tone={TYPE_TONE[t.type]}>{t.type.toLowerCase()}</Badge></td>
                                  <td className="px-3 py-2.5 text-xs text-muted max-w-[200px]">{les ? <span><Icon name="play" className="w-3 h-3 inline mr-1" />{les.title}{gate !== null && <span className="block text-[11px] text-warning">skip needs ≥ {gate}% watched</span>}</span> : t.linkedResourceId ? <span><Icon name="book" className="w-3 h-3 inline mr-1" />{resourceOf(t.linkedResourceId)?.title ?? t.linkedResourceId}</span> : "—"}</td>
                                  <td className="px-3 py-2.5 tabular-nums">{t.xpReward}</td>
                                  <td className="px-3 py-2.5">{t.isRequired ? <Badge tone="warning">required</Badge> : <span className="text-xs text-faint">optional</span>}</td>
                                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                                </tr>
                              );
                            })}
                            {!day.tasks.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">No task yet.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      {editable && <Btn tone="neutral" size="sm" onClick={() => setTask({ day, task: null })}><Icon name="plus" className="w-3.5 h-3.5" /> Add task to day {day.dayNumber}</Btn>}
                    </div>
                  )}
                </Card>
              );
            })}
            {!plan.days.length && <Card><p className="text-sm text-muted">This plan has no day yet.</p></Card>}
            {editable && <Btn tone="neutral" onClick={() => setAddDay(true)}><Icon name="plus" className="w-4 h-4" /> Add day {plan.days.length + 1}</Btn>}
          </div>

          <Card title="Plan" subtitle={<><StatusBadge status={plan.status} /> <span className="ml-1">{plan.durationDays} days · updated {fmtDate(plan.updatedAt, false)}</span></>}>
            <div className="space-y-3">
              <Field label="Title"><input className="input" value={draft.draft.title} onChange={(e) => draft.set("title", e.target.value)} disabled={!editable} /></Field>
              <Field label="Description"><textarea className="input min-h-[80px]" value={draft.draft.description} onChange={(e) => draft.set("description", e.target.value)} disabled={!editable} /></Field>
              {editable && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Btn solid size="sm" disabled={!draft.dirty || busy} onClick={() => run("Plan saved", () => adminApi(`/missions/plans/${id}`, token, { method: "PATCH", body: draft.changed() }))}>Save</Btn>
                  <LifecycleButtons status={plan.status} disabled={busy} onPublish={() => run("Plan published (previous plan archived)", () => adminApi(`/missions/plans/${id}/publish`, token, { method: "POST" }))} onArchive={() => run("Plan archived", () => adminApi(`/missions/plans/${id}/archive`, token, { method: "POST" }))} />
                </div>
              )}
              <p className="text-[11px] text-faint">Publishing replaces the current published plan of this path. Users already enrolled keep their plan.</p>
            </div>
          </Card>
          <Modal open={addDay} onClose={() => setAddDay(false)} title="Add a day">
            <DayCreateForm next={plan.days.length + 1} onCancel={() => setAddDay(false)} onSubmit={async (v) => { await run("Day added", () => adminApi(`/missions/plans/${id}/days`, token, { method: "POST", body: v })); setAddDay(false); setOpenDay(v.dayNumber); }} />
          </Modal>
          {task && <TaskDrawer day={task.day} task={task.task} lessons={pl?.lessons ?? []} resources={resources ?? []} defaultWatch={defaultWatch} editable={editable} onClose={() => setTask(null)} onChanged={(m) => { onChanged(m); reload(); }} onError={onError} />}
        </div>
      )}
    </DataState>
  );
}

function DayForm({ day, editable, onSaved, onError }: { day: AdminMissionDay; editable: boolean; onSaved: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const draft = useDraft<{ title: string; objective: string }>({ title: day.title, objective: day.objective });
  if (!draft.draft) return null;
  return (
    <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
      <Field label="Day title"><input className="input" value={draft.draft.title} onChange={(e) => draft.set("title", e.target.value)} disabled={!editable} /></Field>
      <Field label="Objective"><input className="input" value={draft.draft.objective} onChange={(e) => draft.set("objective", e.target.value)} disabled={!editable} /></Field>
      {editable && <Btn size="sm" solid disabled={!draft.dirty} onClick={() => adminApi(`/missions/days/${day.id}`, token, { method: "PATCH", body: draft.changed() }).then(() => onSaved("Day saved")).catch(onError)}>Save day</Btn>}
    </div>
  );
}

function DayCreateForm({ next, onSubmit, onCancel }: { next: number; onSubmit: (v: { dayNumber: number; title: string; objective: string }) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState({ dayNumber: next, title: "", objective: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[90px_1fr] gap-3"><Field label="Day #"><input className="input" type="number" min={1} value={v.dayNumber} onChange={(e) => setV({ ...v, dayNumber: Number(e.target.value) })} /></Field><Field label="Title"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus /></Field></div>
      <Field label="Objective"><textarea className="input min-h-[60px]" value={v.objective} onChange={(e) => setV({ ...v, objective: e.target.value })} /></Field>
      <div className="flex gap-2"><Btn solid size="sm" disabled={!v.title || busy} onClick={async () => { setBusy(true); try { await onSubmit(v); } finally { setBusy(false); } }}>Add day</Btn><Btn tone="neutral" size="sm" onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

type TaskDraft = { title: string; description: string; type: MissionTaskType; linkedLessonId: string; linkedResourceId: string; xpReward: number; isRequired: boolean; position: number };

function TaskDrawer({ day, task, lessons, resources, defaultWatch, editable, onClose, onChanged, onError }: { day: AdminMissionDay; task: AdminMissionTask | null; lessons: { id: string; title: string; videoUrl: string | null; minWatchPercent?: number | null }[]; resources: AdminResource[]; defaultWatch: number; editable: boolean; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const source: TaskDraft = task ? { title: task.title, description: task.description, type: task.type, linkedLessonId: task.linkedLessonId ?? "", linkedResourceId: task.linkedResourceId ?? "", xpReward: task.xpReward, isRequired: task.isRequired, position: task.position } : { title: "", description: "", type: "ACTION", linkedLessonId: "", linkedResourceId: "", xpReward: 25, isRequired: true, position: day.tasks.length };
  const draft = useDraft<TaskDraft>(source);
  const [busy, setBusy] = useState(false);
  const d = draft.draft;
  if (!d) return null;
  const les = lessons.find((l) => l.id === d.linkedLessonId);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); onClose(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const save = () => {
    if (!task) return run("Task added", () => adminApi(`/missions/days/${day.id}/tasks`, token, { method: "POST", body: { title: d.title, description: d.description, type: d.type, linkedLessonId: d.linkedLessonId || null, linkedResourceId: d.linkedResourceId || null, xpReward: d.xpReward, isRequired: d.isRequired } }));
    const c = draft.changed();
    const body: Record<string, unknown> = { ...c };
    if ("linkedLessonId" in c) body.linkedLessonId = c.linkedLessonId || null;
    if ("linkedResourceId" in c) body.linkedResourceId = c.linkedResourceId || null;
    delete body.type;
    return run("Task saved", () => adminApi(`/missions/tasks/${task.id}`, token, { method: "PATCH", body }));
  };
  return (
    <Drawer open onClose={onClose} title={task ? task.title : `New task · Day ${day.dayNumber}`} dirty={draft.dirty} width="max-w-xl" footer={editable && (
      <>
        <Btn solid disabled={!d.title || (task ? !draft.dirty : false) || busy} onClick={save}>{task ? "Save" : "Add task"}</Btn>
        {task && <div className="ml-auto flex gap-2"><LifecycleButtons status={task.status} disabled={busy} labels={{ publish: "Restore", archive: "Archive task" }} onPublish={() => run("Task restored", () => adminApi(`/missions/tasks/${task.id}/publish`, token, { method: "POST" }))} onArchive={() => run("Task archived", () => adminApi(`/missions/tasks/${task.id}/archive`, token, { method: "POST" }))} /></div>}
      </>
    )}>
      <div className="space-y-4">
        <Field label="Title"><input className="input" value={d.title} onChange={(e) => draft.set("title", e.target.value)} disabled={!editable} autoFocus={!task} /></Field>
        <Field label="Description" hint="Markdown. Tell the user exactly what to do."><textarea className="input min-h-[110px]" value={d.description} onChange={(e) => draft.set("description", e.target.value)} disabled={!editable} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type" hint={task ? "Fixed after creation." : undefined}><select className="input" value={d.type} onChange={(e) => draft.set("type", e.target.value as MissionTaskType)} disabled={!editable || !!task}>{TASK_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select></Field>
          <Field label="XP"><input className="input" type="number" min={0} value={d.xpReward} onChange={(e) => draft.set("xpReward", Number(e.target.value))} disabled={!editable} /></Field>
          <Field label="Position"><input className="input" type="number" min={0} value={d.position} onChange={(e) => draft.set("position", Number(e.target.value))} disabled={!editable || !task} /></Field>
        </div>
        <Field label="Linked lesson" hint="LESSON tasks complete automatically when the lesson is completed."><select className="input" value={d.linkedLessonId} onChange={(e) => draft.set("linkedLessonId", e.target.value)} disabled={!editable}><option value="">— none</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
        {les && les.videoUrl && <p className="text-xs rounded-lg bg-warning/10 text-warning px-3 py-2">Skipping this step needs at least <b>{les.minWatchPercent ?? defaultWatch}%</b> of the video watched{les.minWatchPercent == null ? " (global default)" : " (lesson override)"}.</p>}
        <Field label="Linked resource"><select className="input" value={d.linkedResourceId} onChange={(e) => draft.set("linkedResourceId", e.target.value)} disabled={!editable}><option value="">— none</option>{resources.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></Field>
        <label className="flex items-center gap-3 rounded-xl border border-line p-3"><Toggle checked={d.isRequired} onChange={(v) => draft.set("isRequired", v)} disabled={!editable} label="Required" /><span className="text-sm"><b>Required</b> to complete the day <span className="text-muted">(unless “allow skipping required tasks” is on in Settings)</span></span></label>
      </div>
    </Drawer>
  );
}

function CreatePlanModal({ open, pathId, onClose, onCreated, onError }: { open: boolean; pathId: string; onClose: () => void; onCreated: (p: AdminMissionPlan) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="New mission plan">
      <div className="space-y-3">
        <Field label="Title"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus /></Field>
        <Field label="Description"><textarea className="input min-h-[70px]" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <div className="flex gap-2 pt-2"><Btn solid disabled={!v.title || busy} onClick={async () => { setBusy(true); try { onCreated(await adminApi<AdminMissionPlan>("/missions/plans", token, { method: "POST", body: { pathId, ...v } })); setV({ title: "", description: "" }); } catch (e) { onError(e); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}
