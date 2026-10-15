import { NextRequest, NextResponse } from "next/server";

/**
 * Real analytics for the Overview / Analytics pages.
 *
 * Users, statuses and signups come from the Vaulten API (`/admin/users`, paged with the operator's token).
 * Engagement (sessions, events, lessons, missions, funnel, paths, DAU/WAU) comes from PostHog, which the iOS
 * app reports to. PostHog needs a personal API key on the server: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID
 * (and optionally POSTHOG_HOST, default https://us.posthog.com). Without it the engagement part is null and the
 * page says so instead of inventing numbers.
 */
const API_BASE = (process.env.API_URL || "http://127.0.0.1:4310/api/v1").replace(/\/+$/, "");
const PH_HOST = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/+$/, "");
const PH_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PH_PROJECT = process.env.POSTHOG_PROJECT_ID;

interface ApiUser { id: string; email: string; firstName: string | null; lastName: string | null; timeZone: string; role: string; accountStatus: string; createdAt: string; updatedAt: string }

async function vaulten<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, "X-Client-Platform": "admin-web" }, cache: "no-store" });
  if (!res.ok) throw Object.assign(new Error(`Vaulten API ${res.status} on ${path}`), { status: res.status });
  return res.json() as Promise<T>;
}

async function hogql<T = unknown[]>(query: string): Promise<T[]> {
  const res = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { results: T[] };
  return json.results;
}

const trend = (cur: number, prev: number) => (prev < 5 ? null : ((cur - prev) / prev) * 100);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return problem(401, "UNAUTHENTICATED", "Missing bearer token.");
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days") || 30)));

  // The caller must be staff: ask the Vaulten API who they are.
  let me: { role: string };
  try {
    me = (await vaulten<{ data: { role: string } }>("/users/me", token)).data;
  } catch (e) {
    return problem((e as { status?: number }).status === 401 ? 401 : 502, "UPSTREAM", (e as Error).message);
  }
  if (me.role === "USER") return problem(403, "FORBIDDEN", "Staff only.");

  // ---- Users (real, from the Vaulten API)
  const users: ApiUser[] = [];
  for (let page = 1; page <= 100; page++) {
    const r = await vaulten<{ data: ApiUser[]; meta: { totalPages: number } }>(`/admin/users?page=${page}&pageSize=100`, token);
    users.push(...r.data);
    if (page >= r.meta.totalPages) break;
  }
  const now = Date.now();
  const since = new Date(now - days * 864e5), prev = new Date(now - 2 * days * 864e5);
  const customers = users.filter((u) => u.role === "USER");
  const newUsers = customers.filter((u) => new Date(u.createdAt) >= since).length;
  const prevUsers = customers.filter((u) => { const d = new Date(u.createdAt); return d >= prev && d < since; }).length;
  const signupsByDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) signupsByDay.set(dayKey(new Date(now - i * 864e5)), 0);
  for (const u of customers) { const k = u.createdAt.slice(0, 10); if (signupsByDay.has(k)) signupsByDay.set(k, (signupsByDay.get(k) ?? 0) + 1); }
  const byStatus = ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "DELETED"].map((s) => ({ label: s, value: customers.filter((u) => u.accountStatus === s).length }));
  const recentSignups = [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25);

  // ---- Engagement (real, from PostHog)
  type DayRow = [string, number, number, number, number, number, number, number, number];
  let series: { date: string; sessions: number; events: number; signups: number; lessonsCompleted: number; tasksCompleted: number; paymentsCents: number; firstRevenue: number; coachMessages: number; activeUsers: number }[] = [];
  let engagement: null | { activeUsers24h: number; activeUsers7d: number; sessions: number; events: number; lessonsCompleted: number; tasksCompleted: number; missionsCompleted: number; coachMessages: number; firstRevenueUsers: number } = null;
  let funnel: { label: string; value: number }[] = [];
  let byPath: { label: string; value: number }[] = [];
  let topLessons: { label: string; value: number }[] = [];
  let posthogError: string | null = null;

  if (PH_KEY && PH_PROJECT) {
    try {
      const base = `timestamp >= now() - INTERVAL ${days} DAY AND event NOT IN ('$pageview','$web_vitals','$rageclick','$identify')`;
      const [daily, active, fun, paths, lessons] = await Promise.all([
        hogql<DayRow>(`SELECT toDate(timestamp) AS d, count() AS events, uniq(properties.$session_id) AS sessions, countIf(event = 'lesson_completed') AS lessons, countIf(event = 'mission_task_done') AS tasks, countIf(event = '$ai_generation') AS coach, uniqIf(person_id, event = 'income_logged') AS first_rev, uniq(person_id) AS users, countIf(event = 'mission_completed') AS missions FROM events WHERE ${base} GROUP BY d ORDER BY d LIMIT 400`),
        hogql<[number, number]>(`SELECT uniqIf(person_id, timestamp >= now() - INTERVAL 1 DAY) AS dau, uniq(person_id) AS wau FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND event NOT IN ('$pageview','$web_vitals','$rageclick')`),
        hogql<[number, number, number, number, number]>(`SELECT uniqIf(person_id, event IN ('signed_in','onboarding_completed','Application Installed')) AS signed, uniqIf(person_id, event = 'onboarding_completed') AS onboarded, uniqIf(person_id, event = 'mission_completed' AND toInt(properties.day) = 1) AS day1, uniqIf(person_id, event = 'mission_completed' AND toInt(properties.day) >= 7) AS day7, uniqIf(person_id, event = 'income_logged') AS revenue FROM events WHERE ${base}`),
        hogql<[string, number]>(`SELECT coalesce(nullIf(toString(properties.path), ''), 'unknown') AS p, uniq(person_id) AS n FROM events WHERE ${base} AND event IN ('mission_completed','mission_task_done','lesson_completed','onboarding_completed') GROUP BY p ORDER BY n DESC LIMIT 10`),
        hogql<[string, number]>(`SELECT coalesce(nullIf(toString(properties.lesson_id), ''), 'unknown') AS l, count() AS n FROM events WHERE ${base} AND event = 'lesson_completed' GROUP BY l ORDER BY n DESC LIMIT 8`),
      ]);
      const byDay = new Map(daily.map((r) => [String(r[0]).slice(0, 10), r]));
      series = [...signupsByDay.keys()].map((date) => {
        const r = byDay.get(date);
        return { date, events: r?.[1] ?? 0, sessions: r?.[2] ?? 0, lessonsCompleted: r?.[3] ?? 0, tasksCompleted: r?.[4] ?? 0, coachMessages: r?.[5] ?? 0, firstRevenue: r?.[6] ?? 0, activeUsers: r?.[7] ?? 0, signups: signupsByDay.get(date) ?? 0, paymentsCents: 0 };
      });
      const sum = (k: keyof (typeof series)[number]) => series.reduce((s, d) => s + Number(d[k]), 0);
      engagement = { activeUsers24h: active[0]?.[0] ?? 0, activeUsers7d: active[0]?.[1] ?? 0, sessions: sum("sessions"), events: sum("events"), lessonsCompleted: sum("lessonsCompleted"), tasksCompleted: sum("tasksCompleted"), missionsCompleted: daily.reduce((s, r) => s + (r[8] ?? 0), 0), coachMessages: sum("coachMessages"), firstRevenueUsers: fun[0]?.[4] ?? 0 };
      const f = fun[0] ?? [0, 0, 0, 0, 0];
      funnel = [{ label: "Signed in", value: f[0] }, { label: "Onboarded", value: f[1] }, { label: "Day 1 done", value: f[2] }, { label: "Day 7 done", value: f[3] }, { label: "Logged income", value: f[4] }];
      byPath = paths.map((r) => ({ label: r[0], value: r[1] }));
      topLessons = lessons.map((r) => ({ label: r[0], value: r[1] }));
    } catch (e) {
      posthogError = (e as Error).message;
    }
  } else {
    posthogError = "PostHog is not connected: set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on the server.";
    series = [...signupsByDay.entries()].map(([date, signups]) => ({ date, signups, sessions: 0, events: 0, lessonsCompleted: 0, tasksCompleted: 0, paymentsCents: 0, firstRevenue: 0, coachMessages: 0, activeUsers: 0 }));
  }

  return NextResponse.json({
    data: {
      days,
      sources: { users: "vaulten-api", engagement: engagement ? "posthog" : null, posthogError },
      totals: {
        users: customers.length, newUsers, newUsersTrend: trend(newUsers, prevUsers), staff: users.length - customers.length,
        activeUsers24h: engagement?.activeUsers24h ?? null, activeUsers7d: engagement?.activeUsers7d ?? null,
        sessions: engagement?.sessions ?? null, events: engagement?.events ?? null,
        lessonsCompleted: engagement?.lessonsCompleted ?? null, tasksCompleted: engagement?.tasksCompleted ?? null, missionsCompleted: engagement?.missionsCompleted ?? null,
        coachMessages: engagement?.coachMessages ?? null, firstRevenueUsers: engagement?.firstRevenueUsers ?? null,
      },
      byStatus, byPath, funnel, topLessons, series, recentSignups,
    },
  });
}

function problem(status: number, code: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title: code, status, code, detail }, { status, headers: { "Content-Type": "application/problem+json" } });
}
