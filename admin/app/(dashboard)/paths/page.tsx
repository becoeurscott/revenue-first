"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useDraft, useLoad, useNotice } from "@/lib/hooks";
import type { AdminPath, AdminPathDetail, PathWeek, Tool } from "@/lib/types";
import { TOOLS } from "@/lib/types";
import { Badge, Btn, Card, DataState, Drawer, Field, Modal, Notice, fmtDate } from "@/components/ui";
import { LifecycleButtons, StatusBadge, slugify, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

const TOOL_LABEL: Record<Tool, string> = { PROSPECTS: "Prospects (CRM)", GBP_AUDITS: "GBP audits", OUTREACH_TEMPLATES: "Outreach templates", DEALS: "Deals" };

export default function PathsPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths, loading, error, reload } = usePaths();
  const [openId, setOpenId] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const editable = can("CONTENT_MANAGER");

  return (
    <>
      <Topbar title="Paths & weeks" subtitle="The programs a user can enroll in, and the weekly structure lessons hang on." pill={paths ? `${paths.length} paths` : undefined} actions={editable && <Btn solid size="sm" onClick={() => setCreate(true)}><Icon name="plus" className="w-3.5 h-3.5" /> New path</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <DataState loading={loading && !paths} error={error} onRetry={reload} empty={paths?.length === 0} emptyLabel="No path yet. Create the first one.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paths?.sort((a, b) => a.position - b.position).map((p) => (
            <button key={p.id} onClick={() => setOpenId(p.id)} className="card p-5 text-left hover:border-primary/50 transition cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-light text-primary-text grid place-items-center font-bold">{p.position + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-fg truncate">{p.name}</p>
                  <p className="text-xs text-muted truncate">/{p.slug}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-muted mt-3 line-clamp-2">{p.tagline}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">{p.tools.map((t) => <Badge key={t} tone="primary">{TOOL_LABEL[t]}</Badge>)}{!p.tools.length && <span className="text-xs text-faint">No tools enabled</span>}</div>
              <p className="text-[11px] text-faint mt-3">updated {fmtDate(p.updatedAt)}</p>
            </button>
          ))}
        </div>
      </DataState>
      {openId && <PathDrawer id={openId} onClose={() => setOpenId(null)} onChanged={(m) => { ok(m); reload(); }} onError={fail} editable={editable} />}
      <CreatePathModal open={create} onClose={() => setCreate(false)} onCreated={(p) => { setCreate(false); ok(`Path "${p.name}" created as draft`); reload(); setOpenId(p.id); }} onError={fail} />
    </>
  );
}

function PathDrawer({ id, onClose, onChanged, onError, editable }: { id: string; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void; editable: boolean }) {
  const { token } = useAuth();
  const { data, setData, loading, error, reload } = useLoad(() => adminApi<AdminPathDetail>(`/paths/${id}`, token), [token, id]);
  const draft = useDraft<{ name: string; tagline: string; description: string; position: number }>(data ? { name: data.name, tagline: data.tagline, description: data.description, position: data.position } : null);
  const [busy, setBusy] = useState(false);
  const [addWeek, setAddWeek] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); onChanged(label); reload(); } catch (e) { onError(e); } finally { setBusy(false); }
  };
  const toggleTool = (t: Tool) => {
    if (!data) return;
    const tools = data.tools.includes(t) ? data.tools.filter((x) => x !== t) : [...data.tools, t];
    const prev = data;
    setData({ ...data, tools });
    adminApi(`/paths/${id}/tools`, token, { method: "PUT", body: { tools } }).then(() => onChanged("Tools updated")).catch((e) => { setData(prev); onError(e); });
  };

  return (
    <Drawer open onClose={onClose} title={data?.name ?? "Path"} dirty={draft.dirty} footer={data && editable && (
      <>
        <Btn solid disabled={!draft.dirty || busy} onClick={() => run("Path saved", () => adminApi(`/paths/${id}`, token, { method: "PATCH", body: draft.changed() }))}>Save{draft.dirty ? ` (${draft.dirtyCount})` : ""}</Btn>
        {draft.dirty && <Btn tone="neutral" onClick={draft.reset}>Discard</Btn>}
        <div className="ml-auto flex gap-2"><LifecycleButtons status={data.status} disabled={busy} onPublish={() => run("Path published", () => adminApi(`/paths/${id}/publish`, token, { method: "POST" }))} onArchive={() => run("Path archived", () => adminApi(`/paths/${id}/archive`, token, { method: "POST" }))} /></div>
      </>
    )}>
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && draft.draft && (
          <div className="space-y-6">
            <div className="flex items-center gap-3"><StatusBadge status={data.status} /><code className="text-xs text-faint font-mono">/{data.slug}</code><span className="text-xs text-faint">· created {fmtDate(data.createdAt, false)}</span></div>
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-fg">Catalog</h3>
              <div className="grid sm:grid-cols-[1fr_120px] gap-4">
                <Field label="Name"><input className="input" value={draft.draft.name} onChange={(e) => draft.set("name", e.target.value)} disabled={!editable} /></Field>
                <Field label="Position"><input className="input" type="number" min={0} value={draft.draft.position} onChange={(e) => draft.set("position", Number(e.target.value))} disabled={!editable} /></Field>
              </div>
              <Field label="Tagline" hint="One line, shown on the path card in the app."><input className="input" value={draft.draft.tagline} onChange={(e) => draft.set("tagline", e.target.value)} disabled={!editable} /></Field>
              <Field label="Description" hint="Markdown."><textarea className="input min-h-[140px]" value={draft.draft.description} onChange={(e) => draft.set("description", e.target.value)} disabled={!editable} /></Field>
            </section>
            <section>
              <h3 className="text-sm font-bold text-fg mb-1">Tools</h3>
              <p className="text-xs text-muted mb-3">Which app modules this path unlocks. Saved immediately.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {TOOLS.map((t) => (
                  <label key={t} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${data.tools.includes(t) ? "border-primary bg-primary-light/60" : "border-line"}`}>
                    <input type="checkbox" checked={data.tools.includes(t)} onChange={() => toggleTool(t)} disabled={!editable} className="accent-[var(--color-primary)]" />
                    <span className="text-sm font-medium">{TOOL_LABEL[t]}</span>
                  </label>
                ))}
              </div>
            </section>
            <section>
              <div className="flex items-center mb-3"><h3 className="text-sm font-bold text-fg">Weeks</h3><span className="text-xs text-muted ml-2">{data.weeks.length}</span>{editable && <Btn size="sm" tone="neutral" className="ml-auto" onClick={() => setAddWeek(true)}><Icon name="plus" className="w-3.5 h-3.5" /> Add week</Btn>}</div>
              <div className="space-y-2">
                {data.weeks.sort((a, b) => a.position - b.position).map((w) => <WeekRow key={w.id} pathId={id} week={w} editable={editable} onSaved={() => { onChanged("Week saved"); reload(); }} onError={onError} />)}
                {!data.weeks.length && <p className="text-sm text-muted">No week yet. Lessons need a week to live in.</p>}
              </div>
            </section>
          </div>
        )}
      </DataState>
      <Modal open={addWeek} onClose={() => setAddWeek(false)} title="Add a week">
        <WeekForm initial={{ number: (data?.weeks.length ?? 0) + 1, title: "", objective: "" }} onCancel={() => setAddWeek(false)} onSubmit={async (v) => { await run("Week added", () => adminApi(`/paths/${id}/weeks`, token, { method: "POST", body: v })); setAddWeek(false); }} />
      </Modal>
    </Drawer>
  );
}

function WeekRow({ pathId, week, editable, onSaved, onError }: { pathId: string; week: PathWeek; editable: boolean; onSaved: () => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [edit, setEdit] = useState(false);
  return (
    <div className="rounded-xl border border-line p-3">
      {edit ? (
        <WeekForm initial={{ number: week.number, title: week.title, objective: week.objective, position: week.position }} onCancel={() => setEdit(false)} onSubmit={async (v) => { const body: Record<string, unknown> = {}; for (const k of Object.keys(v) as (keyof typeof v)[]) if (v[k] !== week[k as keyof PathWeek]) body[k] = v[k]; try { await adminApi(`/paths/${pathId}/weeks/${week.id}`, token, { method: "PATCH", body }); setEdit(false); onSaved(); } catch (e) { onError(e); } }} />
      ) : (
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-sunken grid place-items-center text-xs font-bold text-muted shrink-0">W{week.number}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{week.title}</p>
            <p className="text-xs text-muted">{week.objective || "No objective yet"}</p>
          </div>
          <Link href={`/lessons?weekId=${week.id}`} className="text-xs text-primary-text whitespace-nowrap">lessons →</Link>
          {editable && <button onClick={() => setEdit(true)} className="text-xs text-muted hover:text-fg cursor-pointer">edit</button>}
        </div>
      )}
    </div>
  );
}

function WeekForm({ initial, onSubmit, onCancel }: { initial: { number: number; title: string; objective: string; position?: number }; onSubmit: (v: { number: number; title: string; objective: string; position?: number }) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <Field label="Week #"><input className="input" type="number" min={1} value={v.number} onChange={(e) => setV({ ...v, number: Number(e.target.value) })} /></Field>
        <Field label="Title"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus /></Field>
      </div>
      <Field label="Objective" hint="What the user should achieve this week."><textarea className="input min-h-[60px]" value={v.objective} onChange={(e) => setV({ ...v, objective: e.target.value })} /></Field>
      <div className="flex gap-2"><Btn solid size="sm" disabled={!v.title || busy} onClick={async () => { setBusy(true); try { await onSubmit(v); } finally { setBusy(false); } }}>Save</Btn><Btn tone="neutral" size="sm" onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function CreatePathModal({ open, onClose, onCreated, onError }: { open: boolean; onClose: () => void; onCreated: (p: AdminPath) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState({ name: "", slug: "", tagline: "", description: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="New path">
      <div className="space-y-3">
        <Field label="Name"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value, slug: v.slug || slugify(e.target.value) })} autoFocus /></Field>
        <Field label="Slug" hint="URL-safe, unique, cannot change later."><input className="input font-mono" value={v.slug} onChange={(e) => setV({ ...v, slug: slugify(e.target.value) })} /></Field>
        <Field label="Tagline"><input className="input" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></Field>
        <Field label="Description"><textarea className="input min-h-[90px]" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <div className="flex gap-2 pt-2"><Btn solid disabled={!v.name || !v.slug || !v.tagline || busy} onClick={async () => { setBusy(true); try { onCreated(await adminApi<AdminPath>("/paths", token, { method: "POST", body: v })); setV({ name: "", slug: "", tagline: "", description: "" }); } catch (e) { onError(e); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}
