"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { SupportKind, SupportMessageDetail, SupportPage, SupportStatus } from "@/lib/types";
import { Badge, Btn, Card, DataState, Field, Notice, Pagination, SearchInput, Segmented, Tabs, fmtDate, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";

const STATUS_TONE: Record<SupportStatus, Tone> = { open: "warning", replied: "info", closed: "neutral" };
const PAGE_SIZE = 25;

export default function SupportPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const [status, setStatus] = useState<SupportStatus | "all">("open");
  const [kind, setKind] = useState<SupportKind | "all">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useLoad(() => adminApi<SupportPage>("/support/messages", token, { params: { status: status === "all" ? null : status, kind: kind === "all" ? null : kind, q, page, pageSize: PAGE_SIZE } }), [token, status, kind, q, page]);
  const detail = useLoad(() => (selected ? adminApi<SupportMessageDetail>(`/support/messages/${selected}`, token) : Promise.resolve(null)), [token, selected]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const counts = list.data?.meta.counts;
  const m = detail.data;

  const sendReply = async () => {
    if (!m) return;
    setBusy(true);
    try {
      await adminApi(`/support/messages/${m.id}/replies`, token, { method: "POST", body: { body: reply } });
      ok(`Reply emailed to ${m.email}`);
      setReply("");
      detail.reload();
      list.reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const setMessageStatus = async (next: SupportStatus) => {
    if (!m) return;
    setBusy(true);
    try {
      const d = await adminApi<SupportMessageDetail>(`/support/messages/${m.id}`, token, { method: "PATCH", body: { status: next } });
      detail.setData(d);
      ok(next === "closed" ? `#${m.ticketNumber} closed` : `#${m.ticketNumber} reopened`);
      list.reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  return (
    <>
      <Topbar title="Support inbox" subtitle="Messages sent from the app's Contact us and Report a problem screens. Replies are emailed to the sender." pill={counts ? `${counts.open} open` : undefined} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs
          active={status}
          onChange={(id) => { setStatus(id as SupportStatus | "all"); setPage(1); }}
          tabs={[
            { id: "open", label: "Open", count: counts?.open, tone: "warning" },
            { id: "replied", label: "Replied", count: counts?.replied },
            { id: "closed", label: "Closed", count: counts?.closed },
            { id: "all", label: "All" },
          ]}
        />
        <Segmented<SupportKind | "all"> options={[{ id: "all", label: "All kinds" }, { id: "contact", label: "Contact" }, { id: "problem", label: "Problem" }]} value={kind} onChange={(v) => { setKind(v); setPage(1); }} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search email, text or #ticket…" className="w-72 ml-auto" />
      </div>
      <div className="grid lg:grid-cols-[420px_1fr] gap-4 items-start">
        <Card pad={false}>
          <DataState loading={list.loading && !list.data} error={list.error} onRetry={list.reload} empty={list.data?.data.length === 0} emptyLabel="No messages here.">
            <ul className="divide-y divide-line">
              {list.data?.data.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setSelected(s.id)} className={`w-full text-left px-5 py-3 flex items-start gap-3 transition cursor-pointer ${selected === s.id ? "bg-primary-light" : "hover:bg-sunken"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm truncate ${s.status === "open" ? "font-semibold text-fg" : "text-muted"}`}>{s.email}</span>
                        <span className="text-[11px] text-faint">#{s.ticketNumber}</span>
                      </div>
                      <p className="text-xs text-muted line-clamp-2">{s.message}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-[11px] text-faint whitespace-nowrap">{fmtDate(s.createdAt)}</p>
                      <div className="flex gap-1 justify-end"><Badge tone={s.kind === "problem" ? "danger" : "primary"}>{s.kind}</Badge><Badge tone={STATUS_TONE[s.status]} dot>{s.status}</Badge></div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </DataState>
          {list.data && <div className="px-5 py-3 border-t border-line"><Pagination page={page} pageSize={PAGE_SIZE} total={list.data.meta.totalItems} onPageChange={setPage} /></div>}
        </Card>

        <Card pad={false}>
          {!selected ? (
            <div className="min-h-[320px] grid place-items-center text-sm text-muted">Select a message to read it.</div>
          ) : (
            <DataState loading={detail.loading && !m} error={detail.error} onRetry={detail.reload} minHeight="min-h-[320px]">
              {m && (
                <div>
                  <div className="px-5 py-4 border-b border-line flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-fg">#{m.ticketNumber} · {m.kind === "problem" ? "Problem report" : "Contact"}{m.category ? ` · ${m.category}` : ""}</p>
                      <p className="text-xs text-muted">{m.email} · {fmtDate(m.createdAt)}</p>
                    </div>
                    <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge>
                    {m.status === "closed"
                      ? <Btn size="sm" tone="neutral" disabled={busy} onClick={() => void setMessageStatus("open")}><Icon name="refresh" className="w-4 h-4" /> Reopen</Btn>
                      : <Btn size="sm" tone="neutral" disabled={busy} onClick={() => void setMessageStatus("closed")}><Icon name="check" className="w-4 h-4" /> Close</Btn>}
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-sm text-fg whitespace-pre-wrap">{m.message}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-sunken p-3 text-xs space-y-1">
                        <p className="text-[11px] text-faint mb-1">Device</p>
                        <p className="text-muted">App <span className="text-fg">{m.appVersion ?? "—"}</span> · {m.platform}</p>
                        <p className="text-muted">{m.device ?? "Unknown device"} · iOS {m.osVersion ?? "—"}</p>
                      </div>
                      <div className="rounded-xl bg-sunken p-3 text-xs space-y-1">
                        <p className="text-[11px] text-faint mb-1">User</p>
                        {m.user ? (
                          <>
                            <Link href={`/users/${m.user.id}`} className="text-sm font-semibold text-primary-text">{m.user.name} →</Link>
                            <p className="text-muted">{m.user.email}</p>
                            <p className="text-muted">Plan <span className="text-fg">{m.user.plan ?? "—"}</span> · Journey <span className="text-fg">{m.user.journey ?? "—"}</span></p>
                          </>
                        ) : <p className="text-muted">Sent without an account (signed out).</p>}
                      </div>
                    </div>
                    {m.replies.length > 0 && (
                      <div>
                        <p className="text-[11px] text-faint mb-2">Replies</p>
                        <ul className="space-y-2">
                          {m.replies.map((r) => (
                            <li key={r.id} className="rounded-xl border border-line p-3">
                              <p className="text-[11px] text-muted mb-1">{r.authorName} · {fmtDate(r.createdAt)}</p>
                              <p className="text-sm text-fg whitespace-pre-wrap">{r.body}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Field label="Reply" hint={`Emailed to ${m.email}. Marks the message as replied.`}>
                      <textarea className="input min-h-[110px]" value={reply} onChange={(e) => setReply(e.target.value)} disabled={!can("SUPPORT") || busy} />
                    </Field>
                    <div className="flex justify-end">
                      <Btn solid disabled={!can("SUPPORT") || busy || reply.trim().length < 2} onClick={() => void sendReply()}><Icon name="send" className="w-4 h-4" /> Send reply</Btn>
                    </div>
                  </div>
                </div>
              )}
            </DataState>
          )}
        </Card>
      </div>
    </>
  );
}
