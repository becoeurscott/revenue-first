"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth, roleLabel } from "@/lib/auth";
import { adminApi, downloadAdminFile } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { AuditLog, Paged } from "@/lib/types";
import { Badge, Btn, Card, DataState, JsonDiff, Modal, Notice, Pagination, SearchInput, fmtDate, fromLocalInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function AuditPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [actorId, setActorId] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [open, setOpen] = useState<AuditLog | null>(null);
  const { data, loading, error, reload } = useLoad(
    () => adminApi<Paged<AuditLog>>("/audit-logs", token, { params: { page, pageSize: 50, action, targetType, actorId, occurredAfter: after ? fromLocalInput(after) : undefined, occurredBefore: before ? fromLocalInput(before) : undefined } }),
    [token, page, action, targetType, actorId, after, before],
  );
  const meta = open?.metadata as { before?: unknown; after?: unknown } | undefined;
  return (
    <>
      <Topbar title="Audit log" subtitle="Every staff action, with what changed." pill={data ? `${data.meta.totalItems.toLocaleString("en-US")} entries` : undefined} actions={can("ADMIN") && <Btn tone="neutral" size="sm" onClick={async () => { try { await downloadAdminFile("/exports/audit.csv", token!, "audit.csv"); ok("Export downloaded"); } catch (e) { fail(e); } }}><Icon name="download" className="w-3.5 h-3.5" /> Export CSV</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <SearchInput value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Action, e.g. user.suspended" className="w-64" />
          <SearchInput value={targetType} onChange={(v) => { setTargetType(v); setPage(1); }} placeholder="Target type" className="w-40" />
          <SearchInput value={actorId} onChange={(v) => { setActorId(v); setPage(1); }} placeholder="Actor id" className="w-56" />
          <input type="datetime-local" className="input w-auto bg-card" value={after} onChange={(e) => { setAfter(e.target.value); setPage(1); }} title="After" />
          <input type="datetime-local" className="input w-auto bg-card" value={before} onChange={(e) => { setBefore(e.target.value); setPage(1); }} title="Before" />
        </div>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.data.length === 0} emptyLabel="No entries match.">
          <table className="data w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-2 font-semibold">When</th><th className="px-3 py-2 font-semibold">Action</th><th className="px-3 py-2 font-semibold">Target</th><th className="px-3 py-2 font-semibold">Actor</th><th className="px-5 py-2 font-semibold text-right">Request</th></tr></thead>
            <tbody>
              {data?.data.map((a) => (
                <tr key={a.id} className="border-t border-line hover:bg-sunken/60 cursor-pointer" onClick={() => setOpen(a)}>
                  <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDate(a.occurredAt)}</td>
                  <td className="px-3 py-2.5"><Badge tone={/delet|suspend|archiv|anonym/.test(a.action) ? "danger" : /creat|publish|invit/.test(a.action) ? "success" : "primary"}>{a.action}</Badge></td>
                  <td className="px-3 py-2.5 text-muted"><span className="text-fg">{a.targetType ?? "—"}</span> <code className="text-[11px] font-mono text-faint">{a.targetId?.slice(0, 8)}</code></td>
                  <td className="px-3 py-2.5 text-muted">{a.actorRole ? roleLabel(a.actorRole) : "system"} <code className="text-[11px] font-mono text-faint">{a.actorId?.slice(0, 8)}</code></td>
                  <td className="px-5 py-2.5 text-right"><code className="text-[11px] font-mono text-faint">{a.requestId}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 pb-5">{data && <Pagination page={data.meta.page} pageSize={data.meta.pageSize} total={data.meta.totalItems} onPageChange={setPage} />}</div>
        </DataState>
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ""} wide>
        {open && (
          <div className="space-y-3 text-sm">
            <p className="text-muted">{fmtDate(open.occurredAt)} · {open.targetType} <code className="font-mono text-xs">{open.targetId}</code> · actor <code className="font-mono text-xs">{open.actorId ?? "system"}</code> · request <code className="font-mono text-xs">{open.requestId}</code></p>
            {meta && ("before" in meta || "after" in meta) ? <JsonDiff before={meta.before ?? null} after={meta.after ?? null} /> : <pre className="bg-sunken rounded-lg p-3 text-xs font-mono overflow-x-auto">{JSON.stringify(open.metadata, null, 2)}</pre>}
          </div>
        )}
      </Modal>
    </>
  );
}
