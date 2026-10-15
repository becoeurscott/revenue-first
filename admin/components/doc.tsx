"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { adminApi, errorMessage } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { ContentDoc, ContentVersion } from "@/lib/types";
import Topbar from "./Topbar";
import { Badge, Btn, Card, ConfirmDialog, DataState, Field, Modal, Notice, Tabs, fmtDate } from "./ui";
import { Icon } from "./Icon";

/**
 * Editor for a versioned JSON content document (`/admin/content/:key`).
 * Pages supply a structured form; a raw JSON tab and version history come for free.
 */
export function ContentDocPage<T>({ docKey, title, subtitle, tabs, render }: { docKey: string; title: string; subtitle: string; tabs?: { id: string; label: string }[]; render: (value: T, set: (next: T) => void, tab: string, editable: boolean) => ReactNode }) {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data, setData, loading, error, reload } = useLoad(() => adminApi<ContentDoc<T>>(`/content/${docKey}`, token), [token, docKey]);
  const [value, setValue] = useState<T | null>(null);
  const [tab, setTab] = useState(tabs?.[0]?.id ?? "main");
  const [json, setJson] = useState("");
  const [jsonErr, setJsonErr] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(false);
  const [rollback, setRollback] = useState<ContentVersion | null>(null);
  const editable = can("CONTENT_MANAGER");

  useEffect(() => { if (data) { setValue(data.value); setJson(JSON.stringify(data.value, null, 2)); } }, [data]);
  const dirty = useMemo(() => !!data && JSON.stringify(value) !== JSON.stringify(data.value), [data, value]);
  const set = useCallback((next: T) => { setValue(next); setJson(JSON.stringify(next, null, 2)); }, []);

  const save = async () => {
    if (!data || value === null) return;
    setSaving(true);
    try {
      const r = await adminApi<ContentDoc<T>>(`/content/${docKey}`, token, { method: "PUT", body: { value, baseVersion: data.version, note: note || null } });
      setData(r);
      setNote("");
      ok(`Saved as version ${r.version}. The app picks it up on next launch.`);
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };
  const applyJson = () => { try { set(JSON.parse(json)); setJsonErr(""); } catch (e) { setJsonErr(errorMessage(e)); } };

  return (
    <>
      <Topbar title={title} subtitle={subtitle} pill={data && <>v{data.version} · {fmtDate(data.updatedAt)}</>} actions={<>
        <Btn tone="neutral" size="sm" onClick={() => setHistory(true)}><Icon name="list" className="w-3.5 h-3.5" /> History</Btn>
        {editable && <Btn solid size="sm" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : dirty ? "Save new version" : "Saved"}</Btn>}
      </>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      {dirty && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="warning">Unsaved changes</Badge>
          <input className="input flex-1 min-w-[200px] bg-card" placeholder="Change note (optional, shown in history)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Btn tone="neutral" size="sm" onClick={() => data && set(data.value)}>Discard</Btn>
        </div>
      )}
      <Tabs className="mb-4" active={tab} onChange={setTab} tabs={[...(tabs ?? [{ id: "main", label: "Editor" }]), { id: "__json", label: "JSON" }]} />
      <DataState loading={loading && !data} error={error} onRetry={reload} minHeight="min-h-[300px]">
        {value !== null && (tab === "__json" ? (
          <Card>
            <textarea className="input font-mono text-xs min-h-[520px]" value={json} onChange={(e) => setJson(e.target.value)} disabled={!editable} spellCheck={false} />
            {jsonErr && <p className="text-xs text-danger mt-2">{jsonErr}</p>}
            {editable && <div className="mt-3 flex gap-2"><Btn tone="neutral" size="sm" onClick={applyJson}>Apply JSON to editor</Btn><span className="text-xs text-muted self-center">Then save a new version at the top.</span></div>}
          </Card>
        ) : render(value, set, tab, editable))}
      </DataState>
      <Modal open={history} onClose={() => setHistory(false)} title="Version history" wide>
        <HistoryList docKey={docKey} current={data?.version ?? 0} onRollback={(v) => setRollback(v)} canRollback={can("ADMIN")} />
      </Modal>
      <ConfirmDialog open={!!rollback} onClose={() => setRollback(null)} busy={saving} phrase={rollback ? `v${rollback.version}` : ""} title={`Roll back to version ${rollback?.version}?`} body={<p>A new version is created with that content. Nothing is lost: the current version stays in history.</p>} confirmLabel="Roll back" tone="warning" onConfirm={async () => { setSaving(true); try { const r = await adminApi<ContentDoc<T>>(`/content/${docKey}/rollback`, token, { method: "POST", body: { version: rollback!.version } }); setData(r); setRollback(null); setHistory(false); ok(`Rolled back · now version ${r.version}`); } catch (e) { fail(e); } finally { setSaving(false); } }} />
    </>
  );
}

function HistoryList({ docKey, current, onRollback, canRollback }: { docKey: string; current: number; onRollback: (v: ContentVersion) => void; canRollback: boolean }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<ContentVersion[]>(`/content/${docKey}/versions`, token), [token, docKey, current]);
  return (
    <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}>
      <ul className="divide-y divide-line">
        {data?.map((v) => (
          <li key={v.version} className="py-2.5 flex items-center gap-3 text-sm">
            <Badge tone={v.version === current ? "success" : "neutral"}>v{v.version}</Badge>
            <span className="text-muted">{fmtDate(v.updatedAt)}</span>
            <span className="text-fg truncate">{v.note ?? ""}</span>
            {v.version !== current && canRollback && <Btn size="xs" tone="warning" className="ml-auto" onClick={() => onRollback(v)}>Roll back</Btn>}
          </li>
        ))}
      </ul>
    </DataState>
  );
}

/* ----------------------------------------------------------------- generic editors */

export type FieldSpec<R> = { key: keyof R & string; label: string; kind?: "text" | "textarea" | "number" | "boolean" | "tags" | "select"; options?: string[]; hint?: string; width?: string };

/** Table-like editor for an array of objects. Add, remove, reorder, edit every field. */
export function ListEditor<R extends Record<string, unknown>>({ items, onChange, fields, blank, editable, title, labelOf }: { items: R[]; onChange: (next: R[]) => void; fields: FieldSpec<R>[]; blank: () => R; editable: boolean; title?: string; labelOf?: (r: R) => string }) {
  const [open, setOpen] = useState<number | null>(null);
  const update = (i: number, patch: Partial<R>) => onChange(items.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setOpen(j); };
  return (
    <div>
      {title && <div className="flex items-center mb-2"><h3 className="text-sm font-bold text-fg">{title}</h3><span className="text-xs text-muted ml-2">{items.length}</span></div>}
      <div className="space-y-2">
        {items.map((r, i) => {
          const isOpen = open === i;
          const label = labelOf ? labelOf(r) : String(r[fields[0].key] ?? "");
          return (
            <div key={i} className="rounded-xl border border-line">
              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex-1 text-left text-sm font-medium text-fg truncate cursor-pointer">{label || <span className="text-faint">untitled</span>}</button>
                {editable && <>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-sunken disabled:opacity-30 cursor-pointer"><Icon name="up" className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-sunken disabled:opacity-30 cursor-pointer"><Icon name="down" className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { onChange(items.filter((_, j) => j !== i)); setOpen(null); }} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-danger hover:bg-danger/10 cursor-pointer"><Icon name="trash" className="w-3.5 h-3.5" /></button>
                </>}
                <Icon name="chevron" className={`w-4 h-4 text-faint transition ${isOpen ? "rotate-90" : ""}`} />
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-line grid sm:grid-cols-2 gap-3">
                  {fields.map((f) => <FieldInput key={f.key} spec={f} value={r[f.key]} onChange={(v) => update(i, { [f.key]: v } as Partial<R>)} editable={editable} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editable && <Btn tone="neutral" size="sm" className="mt-3" onClick={() => { onChange([...items, blank()]); setOpen(items.length); }}><Icon name="plus" className="w-3.5 h-3.5" /> Add</Btn>}
    </div>
  );
}

export function FieldInput<R>({ spec, value, onChange, editable }: { spec: FieldSpec<R>; value: unknown; onChange: (v: unknown) => void; editable: boolean }) {
  const kind = spec.kind ?? "text";
  const cls = spec.width ?? (kind === "textarea" || kind === "tags" ? "sm:col-span-2" : "");
  return (
    <Field label={spec.label} hint={spec.hint} className={cls}>
      {kind === "textarea" ? <textarea className="input min-h-[80px]" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!editable} />
        : kind === "number" ? <input className="input" type="number" value={value === null || value === undefined ? "" : Number(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={!editable} />
        : kind === "boolean" ? <select className="input" value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} disabled={!editable}><option value="true">yes</option><option value="false">no</option></select>
        : kind === "select" ? <select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!editable}><option value="">—</option>{spec.options?.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        : kind === "tags" ? <TagsInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} editable={editable} />
        : <input className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!editable} />}
    </Field>
  );
}

export function TagsInput({ value, onChange, editable, placeholder = "Type and press Enter" }: { value: string[]; onChange: (v: string[]) => void; editable: boolean; placeholder?: string }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (t) onChange([...value, t]); setText(""); };
  return (
    <div className="input flex flex-wrap gap-1.5 items-center min-h-[42px]">
      {value.map((t, i) => <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary-light text-primary-text rounded-md px-2 py-0.5">{t}{editable && <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="cursor-pointer opacity-70 hover:opacity-100">×</button>}</span>)}
      {editable && <input className="flex-1 min-w-[120px] bg-transparent outline-none text-sm" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1)); }} onBlur={add} />}
    </div>
  );
}

/** `{ key: string[] }` maps (e.g. per-path prompt lists). */
export function MapOfListsEditor({ value, onChange, editable, keyLabel = "Key" }: { value: Record<string, string[]>; onChange: (v: Record<string, string[]>) => void; editable: boolean; keyLabel?: string }) {
  const [newKey, setNewKey] = useState("");
  return (
    <div className="space-y-3">
      {Object.entries(value).map(([k, list]) => (
        <div key={k} className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-2 mb-2"><Badge tone="primary">{k}</Badge><span className="text-xs text-muted">{list.length} items</span>{editable && <button onClick={() => { const n = { ...value }; delete n[k]; onChange(n); }} className="ml-auto text-xs text-muted hover:text-danger cursor-pointer">remove</button>}</div>
          <StringListEditor value={list} onChange={(l) => onChange({ ...value, [k]: l })} editable={editable} />
        </div>
      ))}
      {editable && <div className="flex gap-2"><input className="input w-56" placeholder={keyLabel} value={newKey} onChange={(e) => setNewKey(e.target.value)} /><Btn tone="neutral" size="sm" disabled={!newKey || newKey in value} onClick={() => { onChange({ ...value, [newKey]: [] }); setNewKey(""); }}>Add key</Btn></div>}
    </div>
  );
}

export function StringListEditor({ value, onChange, editable, multiline }: { value: string[]; onChange: (v: string[]) => void; editable: boolean; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      {value.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          {multiline ? <textarea className="input min-h-[60px]" value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} disabled={!editable} /> : <input className="input" value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} disabled={!editable} />}
          {editable && <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="w-9 h-9 shrink-0 rounded-md grid place-items-center text-muted hover:text-danger hover:bg-danger/10 cursor-pointer"><Icon name="trash" className="w-3.5 h-3.5" /></button>}
        </div>
      ))}
      {editable && <Btn tone="neutral" size="xs" onClick={() => onChange([...value, ""])}><Icon name="plus" className="w-3 h-3" /> Add line</Btn>}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <Card title={title} subtitle={hint} className="mb-4">{children}</Card>;
}
