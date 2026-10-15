"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice, nz } from "@/lib/hooks";
import type { AdminCriterion } from "@/lib/types";
import { Badge, Btn, Card, DataState, Field, Modal, Notice } from "@/components/ui";
import { LifecycleButtons, StatusBadge } from "@/components/content";
import { Icon } from "@/components/Icon";

export default function GbpPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminCriterion[]>("/gbp-audit-criteria", token), [token]);
  const [edit, setEdit] = useState<AdminCriterion | "new" | null>(null);
  const editable = can("CONTENT_MANAGER");
  const live = (data ?? []).filter((c) => c.status === "PUBLISHED");
  const maxPoints = live.reduce((s, c) => s + c.points, 0);
  const run = (label: string, fn: () => Promise<unknown>) => fn().then(() => { ok(label); reload(); setEdit(null); }).catch(fail);

  return (
    <>
      <Topbar title="GBP audit checklist" subtitle="What users check on a prospect's Google Business Profile. The audit score is met points / total published points." pill={data ? `${live.length} live · ${maxPoints} pts max` : undefined} actions={editable && <Btn solid size="sm" onClick={() => setEdit("new")}><Icon name="plus" className="w-3.5 h-3.5" /> New criterion</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Card pad={false}>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.length === 0} emptyLabel="No criterion yet.">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-3 font-semibold">#</th><th className="px-3 py-3 font-semibold">Criterion</th><th className="px-3 py-3 font-semibold">Points</th><th className="px-3 py-3 font-semibold">Weight</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead>
            <tbody>
              {data?.sort((a, b) => a.position - b.position).map((c) => (
                <tr key={c.id} onClick={() => setEdit(c)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                  <td className="px-5 py-3 text-muted">{c.position + 1}</td>
                  <td className="px-3 py-3"><p className="font-medium text-fg">{c.label}</p>{c.description && <p className="text-xs text-muted">{c.description}</p>}</td>
                  <td className="px-3 py-3 tabular-nums font-semibold">{c.points}</td>
                  <td className="px-3 py-3 w-40">{c.status === "PUBLISHED" ? <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-sunken overflow-hidden"><div className="h-full bg-primary" style={{ width: `${maxPoints ? (c.points / maxPoints) * 100 : 0}%` }} /></div><span className="text-xs text-muted tabular-nums">{maxPoints ? Math.round((c.points / maxPoints) * 100) : 0}%</span></div> : <span className="text-xs text-faint">not counted</span>}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "New criterion" : "Edit criterion"}>
        {edit && <CriterionForm c={edit === "new" ? null : edit} editable={editable} onCancel={() => setEdit(null)} run={run} />}
      </Modal>
    </>
  );
}

function CriterionForm({ c, editable, onCancel, run }: { c: AdminCriterion | null; editable: boolean; onCancel: () => void; run: (l: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const { token } = useAuth();
  const [v, setV] = useState({ label: c?.label ?? "", description: c?.description ?? "", points: c?.points ?? 10, position: c?.position ?? 0 });
  const body = () => { if (!c) return { ...v, description: nz(v.description) }; const b: Record<string, unknown> = {}; if (v.label !== c.label) b.label = v.label; if ((v.description || null) !== c.description) b.description = nz(v.description); if (v.points !== c.points) b.points = v.points; if (v.position !== c.position) b.position = v.position; return b; };
  return (
    <div className="space-y-3">
      <Field label="What to check"><input className="input" value={v.label} disabled={!editable} onChange={(e) => setV({ ...v, label: e.target.value })} autoFocus /></Field>
      <Field label="How to check it"><textarea className="input min-h-[70px]" value={v.description} disabled={!editable} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Points (1–100)"><input className="input" type="number" min={1} max={100} value={v.points} disabled={!editable} onChange={(e) => setV({ ...v, points: Number(e.target.value) })} /></Field><Field label="Position"><input className="input" type="number" min={0} value={v.position} disabled={!editable} onChange={(e) => setV({ ...v, position: Number(e.target.value) })} /></Field></div>
      {c && <div className="flex items-center gap-2 text-xs text-muted"><StatusBadge status={c.status} />{c.status !== "PUBLISHED" && <Badge tone="neutral">not on new audits</Badge>}</div>}
      <div className="flex gap-2 pt-2 flex-wrap">
        {editable && <Btn solid disabled={!v.label || v.points < 1} onClick={() => run(c ? "Criterion saved" : "Criterion created as draft", () => c ? adminApi(`/gbp-audit-criteria/${c.id}`, token, { method: "PATCH", body: body() }) : adminApi("/gbp-audit-criteria", token, { method: "POST", body: body() }))}>{c ? "Save" : "Create draft"}</Btn>}
        {c && editable && <LifecycleButtons status={c.status} onPublish={() => run("Criterion published", () => adminApi(`/gbp-audit-criteria/${c.id}/publish`, token, { method: "POST" }))} onArchive={() => run("Criterion archived", () => adminApi(`/gbp-audit-criteria/${c.id}/archive`, token, { method: "POST" }))} />}
        <Btn tone="neutral" onClick={onCancel} className="ml-auto">Close</Btn>
      </div>
    </div>
  );
}
