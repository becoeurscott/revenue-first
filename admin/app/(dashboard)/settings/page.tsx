"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { Setting } from "@/lib/types";
import { Badge, Btn, Card, DataState, Notice, Toggle, fmtDate } from "@/components/ui";

const GROUPS: [string, string, string][] = [
  ["lessons", "Lessons & video", "How lessons are completed, including the watch-percentage gate."],
  ["videos", "Lesson videos", "YouTube videos played inside the app, with watch tracking."],
  ["missions", "Missions", "Daily plan behaviour."],
  ["progress", "Progress & XP", "Levels, streaks and milestones."],
  ["xp", "XP rewards", "Points per action."],
  ["revenue", "Revenue", "Milestones that award XP."],
  ["coach", "Coach", "AI coach limits and model."],
  ["trial", "Trial & paywall", "Free access rules."],
  ["app", "App versions", "Minimum and latest iOS builds."],
  ["security", "Security", "Sign-in protection."],
];

export default function SettingsPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const { data, setData, loading, error, reload } = useLoad(() => adminApi<Setting[]>("/settings", token), [token]);
  const editable = can("ADMIN");

  const save = async (s: Setting, value: unknown) => {
    const prev = data!;
    setData(prev.map((x) => (x.key === s.key ? { ...x, value } : x)));
    try {
      const r = await adminApi<Setting>(`/settings/${encodeURIComponent(s.key)}`, token, { method: "PATCH", body: { value } });
      setData((d) => (d ?? []).map((x) => (x.key === s.key ? r : x)));
      ok(`${s.key} saved`);
    } catch (e) {
      setData(prev);
      fail(e);
    }
  };

  const groups = GROUPS.map(([prefix, title, desc]) => ({ prefix, title, desc, items: (data ?? []).filter((s) => s.key.startsWith(prefix + ".")) })).filter((g) => g.items.length);
  const other = (data ?? []).filter((s) => !GROUPS.some(([p]) => s.key.startsWith(p + ".")));
  if (other.length) groups.push({ prefix: "other", title: "Other", desc: "", items: other });

  return (
    <>
      <Topbar title="Settings" subtitle="Numbers and switches the app reads at runtime. Changes apply immediately." pill={data ? `${data.length} settings` : undefined} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {groups.map((g) => (
            <Card key={g.prefix} title={g.title} subtitle={g.desc}>
              <ul className="divide-y divide-line">
                {g.items.map((s) => <SettingRow key={s.key} s={s} editable={editable} onSave={(v) => save(s, v)} />)}
              </ul>
            </Card>
          ))}
        </div>
      </DataState>
    </>
  );
}

function SettingRow({ s, editable, onSave }: { s: Setting; editable: boolean; onSave: (v: unknown) => Promise<void> }) {
  const [text, setText] = useState(() => (s.type === "string" ? String(s.value ?? "") : JSON.stringify(s.value)));
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const isDefault = JSON.stringify(s.value) === JSON.stringify(s.defaultValue);
  const name = s.key.split(".").slice(1).join(".");

  const commit = async () => {
    setErr("");
    let v: unknown = text;
    if (s.type !== "string") {
      try { v = JSON.parse(text); } catch { setErr("Not valid JSON"); return; }
    }
    if (s.type === "number" && typeof v !== "number") { setErr("Must be a number"); return; }
    await onSave(v);
    setEditing(false);
  };

  return (
    <li className="py-3 flex gap-4 items-start">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-fg">{name}</p>
          <code className="text-[10px] text-faint font-mono">{s.key}</code>
          {!isDefault && <Badge tone="warning">changed</Badge>}
        </div>
        <p className="text-xs text-muted mt-0.5">{s.description}</p>
        {s.updatedAt && <p className="text-[11px] text-faint mt-0.5">updated {fmtDate(s.updatedAt)}</p>}
        {editing && (
          <div className="mt-2 flex items-start gap-2">
            {s.type === "number[]" || s.type === "object[]" ? <textarea className="input font-mono text-xs min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} /> : <input className={`input ${s.type !== "string" ? "font-mono" : ""}`} value={text} onChange={(e) => setText(e.target.value)} type={s.type === "number" ? "number" : "text"} />}
            <Btn solid size="sm" onClick={commit}>Save</Btn>
            <Btn tone="neutral" size="sm" onClick={() => { setEditing(false); setText(s.type === "string" ? String(s.value ?? "") : JSON.stringify(s.value)); setErr(""); }}>Cancel</Btn>
          </div>
        )}
        {err && <p className="text-xs text-danger mt-1">{err}</p>}
      </div>
      <div className="shrink-0 text-right">
        {s.type === "boolean" ? (
          <Toggle checked={!!s.value} disabled={!editable} onChange={(v) => onSave(v)} label={s.key} />
        ) : (
          <button disabled={!editable} onClick={() => setEditing(true)} className="text-sm font-mono font-semibold text-fg bg-sunken border border-line rounded-lg px-2.5 py-1 max-w-[220px] truncate block cursor-pointer disabled:cursor-default hover:border-primary/50" title="Edit">
            {s.type === "string" ? String(s.value) : JSON.stringify(s.value)}
          </button>
        )}
        {!isDefault && editable && <button onClick={() => onSave(s.defaultValue)} className="text-[11px] text-muted hover:text-fg mt-1 cursor-pointer">reset to default</button>}
      </div>
    </li>
  );
}
