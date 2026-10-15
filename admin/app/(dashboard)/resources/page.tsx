"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useDraft, useLoad, useNotice } from "@/lib/hooks";
import type { AdminResource, AdminResourceDetail, ResourceSection, ResourceType } from "@/lib/types";
import { RESOURCE_TYPES } from "@/lib/types";
import { Badge, Btn, Card, ConfirmDialog, DataState, Drawer, Field, Modal, Notice, SearchInput, fmtDate } from "@/components/ui";
import { LifecycleButtons, PathSelect, StatusBadge, slugify, usePathChoice, usePathLessons, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

function ResourcesInner() {
  const { token, can } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths } = usePaths();
  const [pathId, setPathId] = usePathChoice(paths);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [create, setCreate] = useState(false);
  const openId = sp.get("id");
  const editable = can("CONTENT_MANAGER");
  const { data, loading, error, reload } = useLoad(() => (pathId ? adminApi<AdminResource[]>("/learning/resources", token, { params: { pathId } }) : Promise.resolve([] as AdminResource[])), [token, pathId]);
  const { data: pl } = usePathLessons(pathId);
  const lessonTitle = (id: string | null) => pl?.lessons.find((l) => l.id === id)?.title;
  const rows = useMemo(() => (data ?? []).filter((r) => (!type || r.type === type) && (!q || r.title.toLowerCase().includes(q.toLowerCase()) || r.slug.includes(q.toLowerCase()))).sort((a, b) => a.position - b.position), [data, type, q]);
  const setOpen = (id: string | null) => { const n = new URLSearchParams(sp.toString()); if (id) n.set("id", id); else n.delete("id"); router.replace(`/resources?${n.toString()}`); };

  return (
    <>
      <Topbar title="Resources" subtitle="Templates, guides, checklists and tools in the library, with their sections." pill={data ? `${data.length} resources` : undefined} actions={editable && <Btn solid size="sm" onClick={() => setCreate(true)} disabled={!pathId}><Icon name="plus" className="w-3.5 h-3.5" /> New resource</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <PathSelect paths={paths} value={pathId} onChange={setPathId} />
          <select className="input w-auto bg-card" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select>
          <SearchInput value={q} onChange={setQ} placeholder="Title or slug" className="w-60" />
        </div>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyLabel="No resource matches.">
          <table className="data w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-2 font-semibold">Resource</th><th className="px-3 py-2 font-semibold">Type</th><th className="px-3 py-2 font-semibold">Attached to lesson</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-5 py-2 font-semibold text-right">Updated</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r.id)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                  <td className="px-5 py-3"><p className="font-semibold text-fg">{r.title}</p><p className="text-xs text-muted">#{r.position + 1} · {r.slug}</p></td>
                  <td className="px-3 py-3"><Badge tone="primary">{r.type.toLowerCase()}</Badge></td>
                  <td className="px-3 py-3 text-muted">{r.lessonId ? lessonTitle(r.lessonId) ?? r.lessonId : <span className="text-faint">— library only</span>}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-right text-muted whitespace-nowrap">{fmtDate(r.updatedAt, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Card>
      {openId && <ResourceDrawer id={openId} lessons={pl?.lessons ?? []} editable={editable} onClose={() => setOpen(null)} onChanged={(m) => { ok(m); reload(); }} onError={fail} />}
      <CreateResourceModal open={create} pathId={pathId} lessons={pl?.lessons ?? []} onClose={() => setCreate(false)} onCreated={(r) => { setCreate(false); ok("Resource created as draft"); reload(); setOpen(r.id); }} onError={fail} />
    </>
  );
}

export default function ResourcesPage() {
  return <Suspense fallback={null}><ResourcesInner /></Suspense>;
}

function ResourceDrawer({ id, lessons, editable, onClose, onChanged, onError }: { id: string; lessons: { id: string; title: string }[]; editable: boolean; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminResourceDetail>(`/learning/resources/${id}`, token), [token, id]);
  const draft = useDraft<{ title: string; type: ResourceType; position: number; lessonId: string; description: string }>(data ? { title: data.title, type: data.type, position: data.position, lessonId: data.lessonId ?? "", description: data.description ?? "" } : null);
  const [busy, setBusy] = useState(false);
  const [addSection, setAddSection] = useState(false);
  const [del, setDel] = useState<ResourceSection | null>(null);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); reload(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const d = draft.draft;
  return (
    <Drawer open onClose={onClose} title={data?.title ?? "Resource"} dirty={draft.dirty} footer={data && editable && (
      <>
        <Btn solid disabled={!draft.dirty || busy} onClick={() => { const c = draft.changed(); const body: Record<string, unknown> = { ...c }; if ("lessonId" in c) body.lessonId = c.lessonId || null; run("Resource saved", () => adminApi(`/learning/resources/${id}`, token, { method: "PATCH", body })); }}>Save{draft.dirty ? ` (${draft.dirtyCount})` : ""}</Btn>
        {draft.dirty && <Btn tone="neutral" onClick={draft.reset}>Discard</Btn>}
        <div className="ml-auto flex gap-2"><LifecycleButtons status={data.status} disabled={busy} onPublish={() => run("Resource published", () => adminApi(`/learning/resources/${id}/publish`, token, { method: "POST" }))} onArchive={() => run("Resource archived", () => adminApi(`/learning/resources/${id}/archive`, token, { method: "POST" }))} /></div>
      </>
    )}>
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && d && (
          <div className="space-y-6">
            <div className="flex items-center gap-3"><StatusBadge status={data.status} /><code className="text-xs text-faint font-mono">{data.slug}</code><span className="text-xs text-faint">· updated {fmtDate(data.updatedAt)}</span></div>
            <section className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_140px_100px] gap-4">
                <Field label="Title"><input className="input" value={d.title} onChange={(e) => draft.set("title", e.target.value)} disabled={!editable} /></Field>
                <Field label="Type"><select className="input" value={d.type} onChange={(e) => draft.set("type", e.target.value as ResourceType)} disabled={!editable}>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select></Field>
                <Field label="Position"><input className="input" type="number" min={0} value={d.position} onChange={(e) => draft.set("position", Number(e.target.value))} disabled={!editable} /></Field>
              </div>
              <Field label="Description" hint="Shown under the title in the library."><textarea className="input min-h-[60px]" value={d.description} onChange={(e) => draft.set("description", e.target.value)} disabled={!editable} /></Field>
              <Field label="Attached to lesson" hint="Attached resources show up inside that lesson; detached ones live only in the library."><select className="input" value={d.lessonId} onChange={(e) => draft.set("lessonId", e.target.value)} disabled={!editable}><option value="">— Library only</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
            </section>
            <section>
              <div className="flex items-center mb-3"><h3 className="text-sm font-bold text-fg">Sections</h3><span className="text-xs text-muted ml-2">{data.sections.length}</span>{editable && <Btn size="sm" tone="neutral" className="ml-auto" onClick={() => setAddSection(true)}><Icon name="plus" className="w-3.5 h-3.5" /> Add section</Btn>}</div>
              <div className="space-y-2">
                {[...data.sections].sort((a, b) => a.position - b.position).map((s, i, arr) => <SectionRow key={s.id} resourceId={id} section={s} editable={editable} first={i === 0} last={i === arr.length - 1} onSaved={(m) => { onChanged(m); reload(); }} onError={onError} onDelete={() => setDel(s)} />)}
                {!data.sections.length && <p className="text-sm text-muted">No section yet. Users complete a resource section by section.</p>}
              </div>
            </section>
          </div>
        )}
      </DataState>
      <Modal open={addSection} onClose={() => setAddSection(false)} title="Add a section" wide>
        <SectionForm initial={{ title: "", body: "" }} onCancel={() => setAddSection(false)} onSubmit={async (v) => { await run("Section added", () => adminApi(`/learning/resources/${id}/sections`, token, { method: "POST", body: v })); setAddSection(false); }} />
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={busy} title="Delete this section?" body={<p>“{del?.title}” is removed from the resource. Users who completed it keep their progress.</p>} confirmLabel="Delete section" onConfirm={() => run("Section deleted", () => adminApi(`/learning/resources/${id}/sections/${del!.id}`, token, { method: "DELETE" })).then(() => setDel(null))} />
    </Drawer>
  );
}

function SectionRow({ resourceId, section, editable, first, last, onSaved, onError, onDelete }: { resourceId: string; section: ResourceSection; editable: boolean; first: boolean; last: boolean; onSaved: (m: string) => void; onError: (e: unknown) => void; onDelete: () => void }) {
  const { token } = useAuth();
  const [edit, setEdit] = useState(false);
  const move = (delta: number) => adminApi(`/learning/resources/${resourceId}/sections/${section.id}`, token, { method: "PATCH", body: { position: Math.max(0, section.position + delta) } }).then(() => onSaved("Section moved")).catch(onError);
  return (
    <div className="rounded-xl border border-line p-3">
      {edit ? (
        <SectionForm initial={{ title: section.title, body: section.body }} onCancel={() => setEdit(false)} onSubmit={async (v) => { const body: Record<string, string> = {}; if (v.title !== section.title) body.title = v.title; if (v.body !== section.body) body.body = v.body; try { await adminApi(`/learning/resources/${resourceId}/sections/${section.id}`, token, { method: "PATCH", body }); setEdit(false); onSaved("Section saved"); } catch (e) { onError(e); } }} />
      ) : (
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-lg bg-sunken grid place-items-center text-xs font-bold text-muted shrink-0">{section.position + 1}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-fg">{section.title}</p><p className="text-xs text-muted line-clamp-2 whitespace-pre-wrap">{section.body}</p></div>
          {editable && (
            <div className="flex items-center gap-1 shrink-0">
              <button disabled={first} onClick={() => move(-1)} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-sunken disabled:opacity-30 cursor-pointer" title="Move up"><Icon name="up" className="w-3.5 h-3.5" /></button>
              <button disabled={last} onClick={() => move(1)} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-sunken disabled:opacity-30 cursor-pointer" title="Move down"><Icon name="down" className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEdit(true)} className="text-xs text-muted hover:text-fg px-1.5 cursor-pointer">edit</button>
              <button onClick={onDelete} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-danger hover:bg-danger/10 cursor-pointer" title="Delete"><Icon name="trash" className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionForm({ initial, onSubmit, onCancel }: { initial: { title: string; body: string }; onSubmit: (v: { title: string; body: string }) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Heading"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus /></Field>
      <Field label="Body" hint="Markdown. One paragraph per line."><textarea className="input min-h-[160px]" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
      <div className="flex gap-2"><Btn solid size="sm" disabled={!v.title || !v.body || busy} onClick={async () => { setBusy(true); try { await onSubmit(v); } finally { setBusy(false); } }}>Save</Btn><Btn tone="neutral" size="sm" onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function CreateResourceModal({ open, pathId, lessons, onClose, onCreated, onError }: { open: boolean; pathId: string; lessons: { id: string; title: string }[]; onClose: () => void; onCreated: (r: AdminResource) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState({ title: "", slug: "", type: "GUIDE" as ResourceType, lessonId: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="New resource">
      <div className="space-y-3">
        <Field label="Title"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value, slug: slugify(e.target.value) })} autoFocus /></Field>
        <Field label="Slug"><input className="input font-mono" value={v.slug} onChange={(e) => setV({ ...v, slug: slugify(e.target.value) })} /></Field>
        <Field label="Type"><select className="input" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as ResourceType })}>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select></Field>
        <Field label="Attach to lesson (optional)"><select className="input" value={v.lessonId} onChange={(e) => setV({ ...v, lessonId: e.target.value })}><option value="">— Library only</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
        <div className="flex gap-2 pt-2"><Btn solid disabled={!v.title || !v.slug || busy} onClick={async () => { setBusy(true); try { onCreated(await adminApi<AdminResource>("/learning/resources", token, { method: "POST", body: { pathId, lessonId: v.lessonId || null, type: v.type, title: v.title, slug: v.slug } })); setV({ title: "", slug: "", type: "GUIDE", lessonId: "" }); } catch (e) { onError(e); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}
