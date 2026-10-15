"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { Maintenance } from "@/lib/types";
import { Badge, Btn, Card, ConfirmDialog, DataState, Field, Notice, fmtDate, fromLocalInput, toLocalInput } from "@/components/ui";

const PRESETS = [["15 min", 15], ["30 min", 30], ["1 h", 60], ["2 h", 120], ["6 h", 360], ["1 day", 1440]] as const;

export default function MaintenancePage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data, setData, loading, error, reload } = useLoad(() => adminApi<Maintenance>("/maintenance", token), [token]);
  const { data: health } = useLoad(() => adminApi<{ status: string; version: string; uptimeSeconds: number; counts: Record<string, number> }>("/system/health", token), [token]);
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (data) { setMessage(data.message); setUntil(toLocalInput(data.until)); } }, [data]);

  const put = async (body: Maintenance) => {
    setBusy(true);
    try { setData(await adminApi<Maintenance>("/maintenance", token, { method: "PUT", body })); ok(body.enabled ? "Maintenance mode is ON" : "Maintenance mode is off"); setConfirm(false); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const remaining = data?.until ? Math.max(0, new Date(data.until).getTime() - now) : null;
  const fmtRemaining = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}m ${(s % 60).toString().padStart(2, "0")}s`; };

  return (
    <>
      <Topbar title="Maintenance" subtitle="Pause the app for users. Staff keep access to this dashboard." pill={data && <Badge tone={data.enabled ? "danger" : "success"} dot>{data.enabled ? "maintenance ON" : "app is live"}</Badge>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
            <Card title={data.enabled ? "App is in maintenance" : "Switch to maintenance"} subtitle="The API answers 503 MAINTENANCE to the iOS app, which shows your message.">
              {data.enabled && (
                <div className="rounded-xl bg-danger/10 border border-danger/30 p-4 mb-4">
                  <p className="text-sm font-semibold text-danger">Users are locked out{remaining !== null ? ` · ends in ${fmtRemaining(remaining)}` : " · no end time"}</p>
                  <p className="text-sm text-fg mt-1">“{data.message || "Vaulten is under maintenance."}”</p>
                  <p className="text-xs text-faint mt-1">since {fmtDate(data.updatedAt)}</p>
                </div>
              )}
              <div className="space-y-4">
                <Field label="Message shown to users"><textarea className="input min-h-[80px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We are upgrading Vaulten. Back in 30 minutes." disabled={!can("ADMIN")} /></Field>
                <Field label="Ends at" hint="Leave empty for no automatic end.">
                  <div className="flex flex-wrap gap-2 mb-2">{PRESETS.map(([l, m]) => <Btn key={l} tone="neutral" size="sm" onClick={() => setUntil(toLocalInput(new Date(Date.now() + m * 60000).toISOString()))}>{l}</Btn>)}</div>
                  <input type="datetime-local" className="input w-auto" value={until} onChange={(e) => setUntil(e.target.value)} disabled={!can("ADMIN")} />
                </Field>
                <div className="flex gap-2">
                  {data.enabled ? (
                    <><Btn tone="success" solid disabled={!can("ADMIN") || busy} onClick={() => put({ ...data, enabled: false })}>End maintenance</Btn><Btn tone="neutral" disabled={!can("ADMIN") || busy} onClick={() => put({ enabled: true, message, until: fromLocalInput(until), updatedAt: null })}>Update message / end time</Btn></>
                  ) : (
                    <Btn tone="danger" solid disabled={!can("ADMIN") || busy} onClick={() => setConfirm(true)}>Enable maintenance mode</Btn>
                  )}
                </div>
              </div>
            </Card>
            <Card title="System health">
              {health ? (
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between"><dt className="text-muted">API</dt><dd><Badge tone={health.status === "ok" ? "success" : "danger"} dot>{health.status}</Badge></dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Version</dt><dd className="font-mono text-xs">{health.version}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Uptime</dt><dd>{Math.round(health.uptimeSeconds / 60)} min</dd></div>
                  {Object.entries(health.counts).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v.toLocaleString("en-US")}</dd></div>)}
                </dl>
              ) : <p className="text-sm text-muted">Health endpoint not available.</p>}
            </Card>
          </div>
        )}
      </DataState>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} busy={busy} phrase="MAINTENANCE" title="Lock users out of the app?" body={<p>Every request from the iOS app is refused with your message until you end maintenance{until ? ` or at ${new Date(until).toLocaleString()}` : ""}.</p>} confirmLabel="Enable maintenance" onConfirm={() => put({ enabled: true, message, until: fromLocalInput(until), updatedAt: null })} />
    </>
  );
}
