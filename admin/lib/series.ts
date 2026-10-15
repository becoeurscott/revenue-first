import type { Point } from "@/components/charts";

/** Bucket daily rows by day (≤30), ISO week (≤180) or month (365), summing values; UTC throughout. */
export function bucket(rows: { date: string }[], key: string, days: number): Point[] {
  const mode = days <= 30 ? "day" : days <= 180 ? "week" : "month";
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.date + "T00:00:00Z");
    let k: string;
    if (mode === "day") k = r.date;
    else if (mode === "month") k = r.date.slice(0, 7);
    else {
      const day = (d.getUTCDay() + 6) % 7; // Monday = 0
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - day);
      k = monday.toISOString().slice(0, 10);
    }
    map.set(k, (map.get(k) ?? 0) + Number((r as Record<string, unknown>)[key] ?? 0));
  }
  return [...map.entries()].map(([k, value]) => ({ label: label(k, mode), value }));
}

function label(k: string, mode: "day" | "week" | "month") {
  if (mode === "month") return new Date(k + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const d = new Date(k + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export const RANGES = [
  { id: 7, label: "1 week" },
  { id: 30, label: "1 month" },
  { id: 90, label: "3 months" },
  { id: 180, label: "6 months" },
  { id: 365, label: "1 year" },
];
