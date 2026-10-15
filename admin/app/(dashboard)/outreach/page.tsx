"use client";

import { useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useDraft, useLoad, useNotice } from "@/lib/hooks";
import type { AdminTemplate, ContactChannel } from "@/lib/types";
import { CHANNELS } from "@/lib/types";
import { Badge, Btn, Card, DataState, Drawer, Field, Modal, Notice, SearchInput, fmtDate } from "@/components/ui";
import { LifecycleButtons, StatusBadge, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

const PLACEHOLDERS = ["businessName", "contactName", "city", "auditScore", "userFirstName"];

export default function OutreachPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths } = usePaths();
  const [pathId, setPathId] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const editable = can("CONTENT_MANAGER");
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminTemplate[]>("/outreach-templates", token, { params: { channel, status } }), [token, channel, status]);
  const rows = useMemo(() => (data ?? []).filter((t) => (!pathId || t.pathId === pathId || (pathId === "all" && !t.pathId)) && (!q || t.title.toLowerCase().includes(q.toLowerCase()) || t.body.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.position - b.position), [data, pathId, q]);
  const pathName = (id: string | null) => (id ? paths?.find((p) => p.id === id)?.name ?? id : "Every path");

  return (
    <>
      <Topbar title="Outreach templates" subtitle="Messages users send to prospects. Placeholders are filled with the prospect's data." pill={data ? `${data.length} templates` : undefined} actions={editable && <Btn solid size="sm" onClick={() => setCreate(true)}><Icon name="plus" className="w-3.5 h-3.5" /> New template</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <select className="input w-auto bg-card" value={pathId} onChange={(e) => setPathId(e.target.value)}><option value="">All paths</option><option value="all">Shared (every path)</option>{paths?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className="input w-auto bg-card" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">All channels</option>{CHANNELS.map((c) => <option key={c} value={c}>{c.replace("_", " ").toLowerCase()}</option>)}</select>
          <select className="input w-auto bg-card" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
          <SearchInput value={q} onChange={setQ} placeholder="Title or body" className="w-56" />
        </div>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyLabel="No template matches.">
          <table className="data w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-2 font-semibold">Template</th><th className="px-3 py-2 font-semibold">Channel</th><th className="px-3 py-2 font-semibold">Path</th><th className="px-3 py-2 font-semibold">Placeholders</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-5 py-2 font-semibold text-right">Updated</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} onClick={() => setOpenId(t.id)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                  <td className="px-5 py-3"><p className="font-semibold text-fg">{t.title}</p><p className="text-xs text-muted line-clamp-1 max-w-[420px]">{t.body}</p></td>
                  <td className="px-3 py-3"><Badge tone="primary">{t.channel.replace("_", " ").toLowerCase()}</Badge></td>
                  <td className="px-3 py-3 text-muted">{pathName(t.pathId)}</td>
                  <td className="px-3 py-3 text-xs text-muted">{[...new Set((t.title + t.body).match(/\{\{(\w+)\}\}/g) ?? [])].join(" ") || "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3 text-right text-muted whitespace-nowrap">{fmtDate(t.updatedAt, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Card>
      {openId && <TemplateDrawer id={openId} paths={paths ?? []} editable={editable} onClose={() => setOpenId(null)} onChanged={(m) => { ok(m); reload(); }} onError={fail} />}
      <CreateTemplateModal open={create} paths={paths ?? []} onClose={() => setCreate(false)} onCreated={(t) => { setCreate(false); ok("Template created as draft"); reload(); setOpenId(t.id); }} onError={fail} />
    </>
  );
}

function TemplateDrawer({ id, paths, editable, onClose, onChanged, onError }: { id: string; paths: { id: string; name: string }[]; editable: boolean; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminTemplate>(`/outreach-templates/${id}`, token), [token, id]);
  const draft = useDraft<{ title: string; body: string; channel: ContactChannel; pathId: string; position: number }>(data ? { title: data.title, body: data.body, channel: data.channel, pathId: data.pathId ?? "", position: data.position } : null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState({ businessName: "Bright Smile Dental", contactName: "Dr. Lee", city: "Austin", auditScore: "62", userFirstName: "Alex" });
  const [rendered, setRendered] = useState<{ title: { text: string; missingPlaceholders: string[] }; body: { text: string; missingPlaceholders: string[] } } | null>(null);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); reload(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const d = draft.draft;
  const localRender = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (sample as Record<string, string>)[k] ?? `{{${k}}}`);
  return (
    <Drawer open onClose={onClose} title={data?.title ?? "Template"} dirty={draft.dirty} footer={data && editable && (
      <>
        <Btn solid disabled={!draft.dirty || busy} onClick={() => { const c = draft.changed(); const body: Record<string, unknown> = { ...c }; if ("pathId" in c) body.pathId = c.pathId || null; run("Template saved", () => adminApi(`/outreach-templates/${id}`, token, { method: "PATCH", body })); }}>Save{draft.dirty ? ` (${draft.dirtyCount})` : ""}</Btn>
        {draft.dirty && <Btn tone="neutral" onClick={draft.reset}>Discard</Btn>}
        <div className="ml-auto flex gap-2"><LifecycleButtons status={data.status} disabled={busy} onPublish={() => run("Template published", () => adminApi(`/outreach-templates/${id}/publish`, token, { method: "POST" }))} onArchive={() => run("Template archived", () => adminApi(`/outreach-templates/${id}/archive`, token, { method: "POST" }))} /></div>
      </>
    )}>
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && d && (
          <div className="space-y-5">
            <div className="flex items-center gap-3"><StatusBadge status={data.status} /><span className="text-xs text-faint">updated {fmtDate(data.updatedAt)}</span></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Channel"><select className="input" value={d.channel} disabled={!editable} onChange={(e) => draft.set("channel", e.target.value as ContactChannel)}>{CHANNELS.map((c) => <option key={c} value={c}>{c.replace("_", " ").toLowerCase()}</option>)}</select></Field>
              <Field label="Path"><select className="input" value={d.pathId} disabled={!editable} onChange={(e) => draft.set("pathId", e.target.value)}><option value="">Every path</option>{paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Position"><input className="input" type="number" value={d.position} disabled={!editable} onChange={(e) => draft.set("position", Number(e.target.value))} /></Field>
            </div>
            <Field label="Title / subject"><input className="input" value={d.title} disabled={!editable} onChange={(e) => draft.set("title", e.target.value)} /></Field>
            <Field label="Body" hint={<span>Placeholders: {PLACEHOLDERS.map((p) => <button key={p} type="button" onClick={() => editable && draft.set("body", d.body + `{{${p}}}`)} className="font-mono text-primary-text mr-2 cursor-pointer">{`{{${p}}}`}</button>)}</span>}><textarea className="input min-h-[180px]" value={d.body} disabled={!editable} onChange={(e) => draft.set("body", e.target.value)} /></Field>
            <section className="rounded-xl border border-line p-4">
              <div className="flex items-center mb-3"><h3 className="text-sm font-bold text-fg">Preview with sample prospect</h3><Btn size="xs" tone="neutral" className="ml-auto" onClick={() => adminApi<typeof rendered>(`/outreach-templates/${id}/preview`, token, { method: "POST", body: sample }).then(setRendered).catch(onError)}>Render on server (saved version)</Btn></div>
              <div className="grid sm:grid-cols-5 gap-2 mb-3">{PLACEHOLDERS.map((p) => <input key={p} className="input py-1 text-xs" value={(sample as Record<string, string>)[p]} placeholder={p} onChange={(e) => setSample({ ...sample, [p]: e.target.value })} />)}</div>
              <p className="text-sm font-semibold text-fg">{rendered?.title.text ?? localRender(d.title)}</p>
              <p className="text-sm text-muted whitespace-pre-wrap mt-1">{rendered?.body.text ?? localRender(d.body)}</p>
              {rendered && (rendered.title.missingPlaceholders.length || rendered.body.missingPlaceholders.length) ? <p className="text-xs text-warning mt-2">Missing: {[...rendered.title.missingPlaceholders, ...rendered.body.missingPlaceholders].join(", ")}</p> : null}
            </section>
          </div>
        )}
      </DataState>
    </Drawer>
  );
}

function CreateTemplateModal({ open, paths, onClose, onCreated, onError }: { open: boolean; paths: { id: string; name: string }[]; onClose: () => void; onCreated: (t: AdminTemplate) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [v, setV] = useState({ title: "", body: "", channel: "EMAIL" as ContactChannel, pathId: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="New outreach template" wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel"><select className="input" value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value as ContactChannel })}>{CHANNELS.map((c) => <option key={c} value={c}>{c.replace("_", " ").toLowerCase()}</option>)}</select></Field>
          <Field label="Path"><select className="input" value={v.pathId} onChange={(e) => setV({ ...v, pathId: e.target.value })}><option value="">Every path</option>{paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        </div>
        <Field label="Title / subject"><input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus /></Field>
        <Field label="Body"><textarea className="input min-h-[140px]" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="Hi {{contactName}}, I noticed {{businessName}}…" /></Field>
        <div className="flex gap-2 pt-2"><Btn solid disabled={!v.title || !v.body || busy} onClick={async () => { setBusy(true); try { onCreated(await adminApi<AdminTemplate>("/outreach-templates", token, { method: "POST", body: { ...v, pathId: v.pathId || null } })); setV({ title: "", body: "", channel: "EMAIL", pathId: "" }); } catch (e) { onError(e); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}
