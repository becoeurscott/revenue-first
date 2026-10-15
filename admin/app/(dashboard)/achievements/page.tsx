"use client";

import { ContentDocPage, ListEditor } from "@/components/doc";
import { Card } from "@/components/ui";

type Achievement = { id: string; title: string; description: string; icon: string; metric: string; target: number; money?: boolean | null };
const METRICS = ["missions", "lessons", "streak", "prospects", "contacted", "replies", "clients", "revenue", "daysCompleted", "videosPublished", "uploadsThisWeek", "watchTime", "subscribers", "clickThroughRate", "returningViewers", "channelIncome"];

export default function AchievementsPage() {
  return (
    <ContentDocPage<Achievement[]> docKey="achievements" title="Achievements" subtitle="Badges users unlock when a metric reaches a target." render={(items, set, _tab, editable) => (
      <Card>
        <ListEditor items={items} onChange={set} editable={editable} labelOf={(a) => `${a.title} · ${a.metric} ≥ ${a.target}${a.money ? " $" : ""}`} blank={() => ({ id: `ach-${Date.now()}`, title: "", description: "", icon: "star", metric: "missions", target: 1, money: false })} fields={[
          { key: "id", label: "Id", hint: "Stable, referenced by journeys" },
          { key: "title", label: "Title" },
          { key: "description", label: "Description", kind: "textarea" },
          { key: "icon", label: "SF Symbol", hint: "e.g. figure.walk, trophy.fill" },
          { key: "metric", label: "Metric", kind: "select", options: METRICS },
          { key: "target", label: "Target", kind: "number" },
          { key: "money", label: "Target is money (dollars)", kind: "boolean" },
        ]} />
      </Card>
    )} />
  );
}
