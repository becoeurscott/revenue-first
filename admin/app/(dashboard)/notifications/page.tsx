"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { ApiError, localApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { Paged } from "@/lib/types";
import { Badge, Btn, Card, ConfirmDialog, DataState, Field, Notice, Pagination, Segmented, fmtDate, fromLocalInput } from "@/components/ui";
import { usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

interface PushRow { id: string; title: string; body: string; link: string | null; audience: "all" | "path" | "user"; userId: string | null; path: string | null; status: string; sentAt: string; delivered: number; failed: number; opened: number }
type Audience = "all" | "path" | "user";

const LINKS = [
  ["/home", "Today"],
  ["/plan", "30-day plan"],
  ["/check-in", "Weekly check-in"],
  ["/coach", "Coach"],
  ["/progress", "Progress"],
  ["/profile", "Profile"],
] as const;

export default function NotificationsPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data: paths } = usePaths();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useLoad(() => localApi<Paged<PushRow>>("/push", token, { page }, { keepMeta: true }), [token, page]);
  const notConfigured = error?.includes("OneSignal is not connected");
  const [v, setV] = useState({ audience: "all" as Audience, path: "", userId: "", title: "", body: "", link: "/home", scheduledAt: "" });
  const [confirm, setConfirm] = useState(false);
  const [cancel, setCancel] = useState<PushRow | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = v.audience === "user" ? can("SUPPORT") : can("ADMIN");
  const ready = !!v.title && !!v.body && (v.audience !== "path" || !!v.path) && (v.audience !== "user" || !!v.userId);

  const send = async () => {
    setBusy(true);
    try {
      const r = await localApi<{ id: string | null; status: string; detail?: string }>("/push", token, undefined, { method: "POST", body: { audience: v.audience, path: v.path || undefined, userId: v.userId.trim() || undefined, title: v.title, body: v.body, link: v.link, scheduledAt: v.scheduledAt ? fromLocalInput(v.scheduledAt) : null } });
      if (r.status === "no_recipients") fail(new ApiError(200, r.detail ?? "Nobody matches this audience yet.", "NO_RECIPIENTS"));
      else ok(r.status === "scheduled" ? "Push scheduled" : "Push sent");
      setV({ ...v, title: "", body: "", scheduledAt: "" });
      setConfirm(false);
      reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const audienceLabel = (n: PushRow) => (n.audience === "user" ? "1 user" : n.audience === "path" ? `path: ${n.path}` : "everyone");

  return (
    <>
      <Topbar title="Push notifications" subtitle="Sent through OneSignal to the iOS app. Tapping one opens the screen you pick." pill={data ? `${data.meta.totalItems} sent` : undefined} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      {notConfigured && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <b>OneSignal is not connected yet.</b> Add <code>ONESIGNAL_APP_ID</code> and <code>ONESIGNAL_REST_API_KEY</code> to the dashboard&apos;s environment, and the same App ID to the iOS app (Monitoring.plist → OneSignalAppID).
        </div>
      )}
      <div className="grid lg:grid-cols-[400px_1fr] gap-4 items-start">
        <Card title="New push">
          <div className="space-y-3">
            <Field label="Send to">
              <Segmented<Audience> options={[{ id: "all", label: "Everyone" }, { id: "path", label: "One path" }, { id: "user", label: "One user" }]} value={v.audience} onChange={(audience) => setV({ ...v, audience })} />
            </Field>
            {v.audience === "path" && (
              <Field label="Path"><select className="input" value={v.path} onChange={(e) => setV({ ...v, path: e.target.value })}><option value="">Choose a path</option>{paths?.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}</select></Field>
            )}
            {v.audience === "user" && (
              <Field label="User id" hint="Open the user's page and copy the id under their name, or use “Send a notification” there."><input className="input font-mono" value={v.userId} onChange={(e) => setV({ ...v, userId: e.target.value })} placeholder="0190…" /></Field>
            )}
            <Field label="Title" hint={`${v.title.length}/80`}><input className="input" value={v.title} maxLength={80} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
            <Field label="Message" hint={`${v.body.length}/240`}><textarea className="input min-h-[90px]" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value.slice(0, 240) })} /></Field>
            <Field label="Opens" hint="Screen shown when the user taps the push. A custom route like /plan/day/7 works too.">
              <input className="input" list="push-links" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} />
              <datalist id="push-links">{LINKS.map(([l, n]) => <option key={l} value={l}>{n}</option>)}</datalist>
            </Field>
            <Field label="Schedule" hint="Leave empty to send now."><input type="datetime-local" className="input" value={v.scheduledAt} onChange={(e) => setV({ ...v, scheduledAt: e.target.value })} /></Field>
            <div className="rounded-xl bg-sunken p-3">
              <p className="text-[11px] text-faint mb-1.5">Lock screen preview</p>
              <div className="flex gap-2.5 rounded-xl bg-card border border-line p-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet shrink-0 grid place-items-center text-white text-xs font-bold">V</span>
                <div className="min-w-0"><p className="text-[11px] text-muted">VAULTEN · now</p><p className="text-sm font-semibold text-fg truncate">{v.title || "Title"}</p><p className="text-xs text-muted line-clamp-2">{v.body || "Message"}</p></div>
              </div>
            </div>
            <Btn solid disabled={!canSend || !ready || busy || notConfigured} onClick={() => setConfirm(true)} className="w-full justify-center">
              <Icon name="send" className="w-4 h-4" /> {v.scheduledAt ? "Schedule" : "Send"} {v.audience === "all" ? "to everyone" : v.audience === "path" ? "to this path" : "to this user"}
            </Btn>
            {!canSend && <p className="text-xs text-muted">Sending to everyone or a path needs the Admin role.</p>}
          </div>
        </Card>
        <Card title="History" pad={false}>
          <DataState loading={loading && !data} error={notConfigured ? null : error} onRetry={reload} empty={!data || data.data.length === 0} emptyLabel={notConfigured ? "Connect OneSignal to see sent pushes." : "Nothing sent yet."}>
            <ul className="divide-y divide-line">
              {data?.data.map((n) => (
                <li key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <Badge tone={n.audience === "all" ? "primary" : n.audience === "path" ? "accent" : "neutral"}>{audienceLabel(n)}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                    <p className="text-[11px] text-faint mt-0.5">opens {n.link ?? "/home"}{n.userId && <> · <Link href={`/users/${n.userId}`} className="text-primary-text">view user</Link></>}</p>
                  </div>
                  <div className="text-right text-xs text-muted whitespace-nowrap">
                    <p>{fmtDate(n.sentAt)}</p>
                    <p><Badge tone={n.status === "sent" ? "success" : n.status === "scheduled" ? "warning" : n.status === "canceled" ? "danger" : "info"}>{n.status}</Badge></p>
                    {n.status !== "scheduled" && <p className="mt-1">{n.delivered} delivered · {n.opened} opened{n.failed ? ` · ${n.failed} failed` : ""}</p>}
                    {n.status === "scheduled" && can("ADMIN") && <button onClick={() => setCancel(n)} className="mt-1 text-danger cursor-pointer">cancel</button>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">{data && <Pagination page={data.meta.page} pageSize={data.meta.pageSize} total={data.meta.totalItems} onPageChange={setPage} />}</div>
          </DataState>
        </Card>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} busy={busy} phrase={v.audience === "user" ? undefined : "SEND"} tone="primary" title={v.scheduledAt ? "Schedule this push?" : v.audience === "all" ? "Send to every subscribed user?" : v.audience === "path" ? `Send to everyone on ${v.path}?` : "Send to this user?"} body={<><p className="font-semibold text-fg">{v.title}</p><p>{v.body}</p><p className="text-xs mt-2">Delivered pushes cannot be recalled.</p></>} confirmLabel={v.scheduledAt ? "Schedule" : "Send now"} onConfirm={send} />
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} busy={busy} title="Cancel this scheduled push?" body={<p>“{cancel?.title}” will not be sent.</p>} confirmLabel="Cancel push" onConfirm={async () => { setBusy(true); try { await localApi("/push", token, { id: cancel!.id }, { method: "DELETE" }); ok("Scheduled push canceled"); setCancel(null); reload(); } catch (e) { fail(e); } finally { setBusy(false); } }} />
    </>
  );
}
