"use client";

import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { FeatureFlag } from "@/lib/types";
import { Badge, Card, DataState, Notice, Toggle, fmtDate } from "@/components/ui";

export default function FlagsPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data, setData, loading, error, reload } = useLoad(() => adminApi<FeatureFlag[]>("/feature-flags", token), [token]);

  const toggle = async (f: FeatureFlag, enabled: boolean) => {
    const prev = data!;
    setData(prev.map((x) => (x.key === f.key ? { ...x, enabled } : x)));
    try {
      const r = await adminApi<FeatureFlag>(`/feature-flags/${encodeURIComponent(f.key)}`, token, { method: "PATCH", body: { enabled } });
      setData((d) => (d ?? []).map((x) => (x.key === f.key ? r : x)));
      ok(`${f.key} ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      setData(prev);
      fail(e);
    }
  };

  return (
    <>
      <Topbar title="Feature flags" subtitle="Turn parts of the app on or off for everyone, instantly." pill={data ? `${data.filter((f) => f.enabled).length} / ${data.length} on` : undefined} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        <Card pad={false}>
          <ul className="divide-y divide-line">
            {data?.map((f) => (
              <li key={f.key} className="px-5 py-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-fg font-mono">{f.key}</p>
                    {f.enabled !== f.defaultEnabled && <Badge tone="warning">differs from default ({f.defaultEnabled ? "on" : "off"})</Badge>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{f.description}</p>
                  {f.updatedAt && <p className="text-[11px] text-faint mt-0.5">changed {fmtDate(f.updatedAt)}</p>}
                </div>
                <Badge tone={f.enabled ? "success" : "neutral"} dot>{f.enabled ? "on" : "off"}</Badge>
                <Toggle checked={f.enabled} disabled={!can("ADMIN")} onChange={(v) => toggle(f, v)} label={f.key} />
              </li>
            ))}
          </ul>
        </Card>
      </DataState>
    </>
  );
}
