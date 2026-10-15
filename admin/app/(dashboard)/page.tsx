"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { localApi } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import type { Overview } from "@/lib/types";
import { Badge, Card, DataState, KpiTile, Segmented, fmtDate, fullName, statusTone, Avatar } from "@/components/ui";
import { BarChart, LineChart, Donut, DonutLegend, HBars } from "@/components/charts";
import { bucket, RANGES } from "@/lib/series";

const COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-warning)", "var(--color-danger)", "var(--color-success)"];
const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-US"));

export default function OverviewPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useLoad(() => localApi<Overview>("/analytics", token, { days }), [token, days]);
  const t = data?.totals;
  const rangeLabel = RANGES.find((r) => r.id === days)?.label ?? `${days} days`;
  const unit = days <= 30 ? "per day" : days <= 180 ? "per week" : "per month";
  const statusSeg = (data?.byStatus ?? []).map((s, i) => ({ label: s.label.replace("_", " ").toLowerCase(), value: s.value, color: COLORS[i % COLORS.length] }));
  const pathSeg = (data?.byPath ?? []).map((s, i) => ({ label: s.label, value: s.value, color: COLORS[i % COLORS.length] }));
  const ph = !!data?.sources.engagement;

  return (
    <>
      <Topbar title="Overview" subtitle="Live numbers from the Vaulten API and PostHog." pill={`Last ${rangeLabel.toLowerCase()}`} actions={<Segmented options={RANGES.map((r) => ({ id: String(r.id), label: r.label }))} value={String(days)} onChange={(v) => setDays(Number(v))} />} />
      <DataState loading={loading && !data} error={error} onRetry={reload} minHeight="min-h-[400px]">
        {t && data && (
          <div className="space-y-5">
            {!ph && <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"><b>Engagement data unavailable.</b> {data.sources.posthogError} Accounts and signups below are live from the API.</div>}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiTile label="Customers" value={n(t.users)} delta={t.newUsersTrend} hint={`+${t.newUsers} in range · ${t.staff} staff`} />
              <KpiTile label="Lessons completed" value={n(t.lessonsCompleted)} hint={ph ? `${n(t.tasksCompleted)} mission tasks · ${n(t.missionsCompleted)} days done` : "needs PostHog"} />
              <KpiTile label="Logged first income" value={n(t.firstRevenueUsers)} hint={ph ? "users in range" : "needs PostHog"} />
              <div className="card p-5 flex items-center gap-4">
                <Donut segments={statusSeg} size={84} thickness={11} center={<span className="text-sm font-bold">{t.users}</span>} />
                <div className="min-w-0"><p className="text-[13px] font-semibold text-muted mb-2">Accounts</p><DonutLegend segments={statusSeg} /></div>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="Sessions" subtitle={`${n(t.sessions)} · ${rangeLabel} · ${unit}`}><BarChart data={bucket(data.series, "sessions", days)} height={210} /></Card>
              <Card title="Activity" subtitle={`${n(t.events)} events · ${rangeLabel}`}><LineChart data={bucket(data.series, "events", days)} height={210} /></Card>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiTile label="Active users (24h)" value={n(t.activeUsers24h)} hint={`${n(t.activeUsers7d)} this week`} />
              <KpiTile label="Coach messages" value={n(t.coachMessages)} hint="in range" />
              <div className="card p-5 flex items-center gap-4">
                <Donut segments={pathSeg} size={84} thickness={11} />
                <div className="min-w-0"><p className="text-[13px] font-semibold text-muted mb-2">Active by path</p>{pathSeg.length ? <DonutLegend segments={pathSeg} /> : <p className="text-xs text-faint">no data</p>}</div>
              </div>
              <Link href="/users?status=PENDING_VERIFICATION" className="card p-5 hover:border-primary/40 transition">
                <p className="text-[13px] font-semibold text-muted">Pending verification</p>
                <p className="text-[28px] font-bold mt-2 tabular-nums">{data.byStatus.find((s) => s.label === "PENDING_VERIFICATION")?.value ?? 0}</p>
                <p className="text-xs text-faint mt-2">accounts that never verified their email</p>
              </Link>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <Card title="Funnel" subtitle="Unique users in range">{data.funnel.length ? <HBars data={data.funnel} /> : <p className="text-sm text-muted">needs PostHog</p>}</Card>
              <Card title="Top lessons" subtitle="Completions in range">{data.topLessons.length ? <HBars data={data.topLessons} color="var(--color-violet)" /> : <p className="text-sm text-muted">no completions yet</p>}</Card>
              <Card title="Signups" subtitle={`${data.series.reduce((s, d) => s + d.signups, 0)} · ${rangeLabel}`}><BarChart data={bucket(data.series, "signups", days)} height={160} color="var(--color-accent)" /></Card>
            </div>
            <Card title="Latest signups" subtitle="25 most recent accounts" pad={false}>
              <div className="max-h-[360px] overflow-y-auto px-5 pb-4">
                <table className="data w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="py-2 pr-3 font-semibold">User</th><th className="py-2 pr-3 font-semibold">Time zone</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 font-semibold">Joined</th></tr></thead>
                  <tbody>
                    {data.recentSignups.map((u) => (
                      <tr key={u.id} className="border-t border-line hover:bg-sunken/60">
                        <td className="py-2.5 pr-3"><Link href={`/users/${u.id}`} className="flex items-center gap-2.5"><Avatar name={fullName(u)} size={28} /><span><span className="font-medium text-fg block leading-tight">{fullName(u)}</span><span className="text-xs text-muted">{u.email}</span></span></Link></td>
                        <td className="py-2.5 pr-3 text-muted">{u.timeZone}</td>
                        <td className="py-2.5 pr-3"><Badge tone={statusTone(u.accountStatus)}>{u.accountStatus.replace("_", " ")}</Badge></td>
                        <td className="py-2.5 text-muted">{fmtDate(u.createdAt, false)}</td>
                      </tr>
                    ))}
                    {!data.recentSignups.length && <tr><td colSpan={4} className="py-8 text-center text-muted">No customer accounts yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </DataState>
    </>
  );
}
