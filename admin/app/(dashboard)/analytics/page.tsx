"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { localApi } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import type { Overview } from "@/lib/types";
import { Card, DataState, KpiTile, Segmented } from "@/components/ui";
import { BarChart, LineChart, HBars } from "@/components/charts";
import { bucket, RANGES } from "@/lib/series";

const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-US"));

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useLoad(() => localApi<Overview>("/analytics", token, { days }), [token, days]);
  const t = data?.totals;
  return (
    <>
      <Topbar title="Analytics" subtitle="Engagement from PostHog (what the iOS app reports) and accounts from the API." actions={<Segmented options={RANGES.map((r) => ({ id: String(r.id), label: r.label }))} value={String(days)} onChange={(v) => setDays(Number(v))} />} />
      <DataState loading={loading && !data} error={error} onRetry={reload} minHeight="min-h-[400px]">
        {t && data && (
          <div className="space-y-5">
            {!data.sources.engagement && <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"><b>Engagement data unavailable.</b> {data.sources.posthogError}</div>}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiTile label="DAU" value={n(t.activeUsers24h)} hint="active in the last 24h" />
              <KpiTile label="WAU" value={n(t.activeUsers7d)} hint="active in the last 7 days" />
              <KpiTile label="Sessions" value={n(t.sessions)} hint="in range" />
              <KpiTile label="Events" value={n(t.events)} hint="in range" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="Active users per day"><LineChart data={bucket(data.series, "activeUsers", days)} height={200} /></Card>
              <Card title="Signups"><BarChart data={bucket(data.series, "signups", days)} height={200} color="var(--color-accent)" /></Card>
              <Card title="Lessons completed"><BarChart data={bucket(data.series, "lessonsCompleted", days)} height={200} color="var(--color-violet)" /></Card>
              <Card title="Mission tasks completed"><BarChart data={bucket(data.series, "tasksCompleted", days)} height={200} /></Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="Funnel" subtitle="Unique users in range">{data.funnel.length ? <HBars data={data.funnel} /> : <p className="text-sm text-muted">needs PostHog</p>}</Card>
              <Card title="Top lessons" subtitle="By completions (lesson id)">{data.topLessons.length ? <HBars data={data.topLessons} color="var(--color-violet)" /> : <p className="text-sm text-muted">no completions yet</p>}</Card>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
