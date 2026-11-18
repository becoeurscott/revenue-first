// Local stand-in for the Vaulten API (admin + auth surface), seeded from the iOS mock data.
// Implements docs/api/vaulten-openapi.json plus the extensions in docs/api/admin-extensions.md.
// Run: node mock-api/server.mjs   (port 4310)
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
import { existsSync } from "node:fs";
const bundled = path.join(here, "data");
const dataDir = existsSync(path.join(bundled, "mock.json")) ? bundled : path.resolve(here, "../../ios/FirstRevenue/FirstRevenue/Resources/Data");
const mock = JSON.parse(readFileSync(path.join(dataDir, "mock.json"), "utf8"));
const journeys = JSON.parse(readFileSync(path.join(dataDir, "journeys.json"), "utf8"));
let yt = null;
try { yt = JSON.parse(readFileSync(path.join(dataDir, "youtube_owned.json"), "utf8")); } catch { /* optional seed */ }
if (yt) {
  mock.paths.push({ ...yt.path, id: yt.path.id ?? "youtube_owned", slug: yt.path.slug ?? "youtube_owned" });
  mock.plans[yt.path.id ?? "youtube_owned"] = yt.plan;
  mock.lessons.push(...yt.lessons.map((l) => ({ ...l, path: yt.path.id ?? "youtube_owned" })));
  mock.resources.push(...yt.resources.map((r) => ({ ...r, path: yt.path.id ?? "youtube_owned" })));
  mock.achievements.push(...(yt.achievements ?? []));
}

const PORT = Number(process.env.PORT || 4310);
const PREFIX = "/api/v1";
const now = () => new Date().toISOString();
// Deterministic ids: every serverless instance seeds the same data, so tokens (which embed a user id) work anywhere.
const idRand = (() => { let x = 20261014; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const uid = () => { const h = () => Math.floor(idRand() * 16).toString(16); let out = ""; for (const c of "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") out += c === "x" ? h() : c === "y" ? (8 + Math.floor(idRand() * 4)).toString(16) : c; return out; };
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const rnd = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const rand = rnd(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------- seed
const FIRST = ["Alex", "Maya", "Jordan", "Sam", "Noah", "Lina", "Omar", "Zoe", "Eli", "Nina", "Ravi", "Tara", "Leo", "Ivy", "Kai", "Mia", "Yann", "Aya", "Ben", "Sara"];
const LAST = ["Carter", "Thompson", "Diallo", "Nguyen", "Okafor", "Martin", "Silva", "Haddad", "Kim", "Rossi", "Mensah", "Berg"];
const users = [];
const adminUser = { id: uid(), email: "admin@vaulten.app", firstName: "Scott", lastName: "Becoeur", timeZone: "Europe/Paris", role: "SUPER_ADMIN", accountStatus: "ACTIVE", createdAt: daysAgo(400), updatedAt: daysAgo(400) };
users.push(adminUser);
users.push({ id: uid(), email: "content@vaulten.app", firstName: "Maya", lastName: "Thompson", timeZone: "America/New_York", role: "CONTENT_MANAGER", accountStatus: "ACTIVE", createdAt: daysAgo(300), updatedAt: daysAgo(10) });
users.push({ id: uid(), email: "support@vaulten.app", firstName: "Jordan", lastName: "Lee", timeZone: "Europe/London", role: "SUPPORT", accountStatus: "ACTIVE", createdAt: daysAgo(200), updatedAt: daysAgo(3) });
const demoUser = { id: null };

const passwords = new Map([["admin@vaulten.app", "admin1234"], ["content@vaulten.app", "content1234"], ["support@vaulten.app", "support1234"], ]);
const MFA_CODE = "000000";
// Tokens are self-describing (kind.userId.random) so stateless hosts (Vercel) accept them on any instance.
const enc = (kind, id) => `${kind}.${id}.${crypto.randomBytes(6).toString("hex")}`;
const dec = (kind, t) => { const [k, id] = String(t ?? "").split("."); return k === kind && users.some((u) => u.id === id) ? id : undefined; };
const mapLike = (kind) => ({ get: (t) => dec(kind, t), set: () => {}, delete: () => {}, [Symbol.iterator]: function* () {} });
const sessions = mapLike("at");
const mfaTokens = mapLike("mfa");
const refreshTokens = mapLike("rt");

const settings = [
  { key: "lessons.minWatchPercent", description: "Default share of a lesson video (0–100) a user must watch before the lesson can be completed or its mission step skipped. Lessons can override it.", type: "number", value: 50, defaultValue: 50, updatedAt: null },
  { key: "lessons.requireWatchToComplete", description: "When off, users can complete any lesson without watching the video.", type: "boolean", value: true, defaultValue: true, updatedAt: null },
  { key: "videos.enabled", description: "Lesson videos from YouTube in the app (lesson player and mission Watch & learn). Off = the app shows no videos.", type: "boolean", value: true, defaultValue: true, updatedAt: null },
  { key: "missions.allowSkipRequiredTasks", description: "Let users skip tasks marked required (they still earn XP for the day).", type: "boolean", value: false, defaultValue: false, updatedAt: null },
  { key: "missions.dayUnlockHourLocal", description: "Local hour at which the next mission day unlocks.", type: "number", value: 5, defaultValue: 5, updatedAt: null },
  { key: "progress.levelThresholds", description: "XP needed to reach each level (level 1 starts at 0).", type: "number[]", value: [0, 200, 500, 1000, 1800, 3000, 5000], defaultValue: [0, 200, 500, 1000, 1800, 3000, 5000], updatedAt: null },
  { key: "progress.streakGraceHours", description: "Hours after local midnight before a missed day breaks the streak.", type: "number", value: 4, defaultValue: 4, updatedAt: null },
  { key: "revenue.milestones", description: "Revenue milestones that award XP.", type: "object[]", value: [{ thresholdCents: 10000, xpReward: 200 }, { thresholdCents: 50000, xpReward: 500 }, { thresholdCents: 100000, xpReward: 1000 }], defaultValue: [{ thresholdCents: 10000, xpReward: 200 }, { thresholdCents: 50000, xpReward: 500 }, { thresholdCents: 100000, xpReward: 1000 }], updatedAt: null },
  { key: "xp.lessonDefault", description: "Default XP for completing a lesson.", type: "number", value: 25, defaultValue: 25, updatedAt: null },
  { key: "xp.checkIn", description: "XP for a weekly check-in.", type: "number", value: 50, defaultValue: 50, updatedAt: null },
  { key: "xp.firstRevenue", description: "XP awarded for the first recorded payment.", type: "number", value: 500, defaultValue: 500, updatedAt: null },
  { key: "trial.days", description: "Free trial length in days after skipping the paywall (0 = Day 1 only).", type: "number", value: 0, defaultValue: 0, updatedAt: null },
  { key: "coach.dailyMessageLimit", description: "Coach messages per user per day.", type: "number", value: 40, defaultValue: 40, updatedAt: null },
  { key: "coach.model", description: "Model used by the coach.", type: "string", value: "claude-sonnet-5-5", defaultValue: "claude-sonnet-5-5", updatedAt: null },
  { key: "app.minVersion", description: "Oldest iOS build allowed to sign in.", type: "string", value: "1.0.0", defaultValue: "1.0.0", updatedAt: null },
  { key: "app.latestVersion", description: "Latest iOS build (shown in the update prompt).", type: "string", value: "1.2.0", defaultValue: "1.2.0", updatedAt: null },
  { key: "app.forceUpdate", description: "Block builds older than minVersion instead of just suggesting an update.", type: "boolean", value: false, defaultValue: false, updatedAt: null },
  { key: "security.lockoutAttempts", description: "Failed sign-ins before a temporary lockout.", type: "number", value: 5, defaultValue: 5, updatedAt: null },
];
const flags = [
  { key: "coach", description: "AI coach tab.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "mentor_check", description: "Mentor check tool.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "pricing_calculator", description: "Pricing calculator in Outreach.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "outreach_generator", description: "AI outreach message generator.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "youtube_owned_channel", description: "Own-channel YouTube journey (coming soon when off).", enabled: false, defaultEnabled: false, updatedAt: null },
  { key: "social_login", description: "Apple / Google sign-in.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "paywall", description: "Show the paywall after onboarding.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "weekly_checkin", description: "Weekly check-in prompt.", enabled: true, defaultEnabled: true, updatedAt: null },
  { key: "video_watch_gate", description: "Enforce the lesson video watch rule.", enabled: true, defaultEnabled: true, updatedAt: null },
];

// Paths, weeks, lessons, resources, mission plans from mock.json
const paths = [];
const weeks = [];
const lessons = [];
const resources = [];
const plans = [];
const pathMeta = { clipping: { name: "Clipping", tagline: "Turn long videos into viral clips for creators.", tools: ["PROSPECTS", "OUTREACH_TEMPLATES", "DEALS"] }, gbp: { name: "Google Business Profile", tagline: "Fix local businesses' Google profiles for a fee.", tools: ["PROSPECTS", "GBP_AUDITS", "OUTREACH_TEMPLATES", "DEALS"] }, youtube_owned: { name: "YouTube channel", tagline: "Build and monetize your own channel.", tools: [] } };
let pos = 0;
for (const p of mock.paths) {
  const meta = pathMeta[p.id] ?? { name: p.name ?? p.title ?? p.id, tagline: p.tagline ?? "", tools: [] };
  if (p.name && pathMeta[p.id]) meta.name = p.name;
  if (p.tagline && pathMeta[p.id]) meta.tagline = p.tagline;
  const id = uid();
  paths.push({ id, slug: p.id, name: meta.name, tagline: meta.tagline, description: p.description ?? meta.tagline, position: pos++, tools: meta.tools, status: "PUBLISHED", createdAt: daysAgo(120), updatedAt: daysAgo(5) });
  const pw = (p.weeks ?? []).length ? p.weeks : [1, 2, 3, 4].map((n) => ({ week: n, title: `Week ${n}`, goal: "" }));
  pw.forEach((w, i) => weeks.push({ id: uid(), pathId: id, number: w.week ?? i + 1, title: w.title ?? `Week ${i + 1}`, objective: w.goal ?? w.focus ?? "", position: i, createdAt: daysAgo(120), updatedAt: daysAgo(5) }));
}
const pathBySlug = (s) => paths.find((p) => p.slug === s);
const lessonIdMap = new Map();
mock.lessons.forEach((l, i) => {
  const slugs = l.path === "all" ? paths.map((p) => p.slug) : [l.path];
  slugs.forEach((s) => {
    const p = pathBySlug(s); if (!p) return;
    const pw = weeks.filter((w) => w.pathId === p.id);
    const week = pw[i % pw.length];
    const id = uid();
    if (s === slugs[0]) lessonIdMap.set(l.id, id);
    lessons.push({ id, pathId: p.id, weekId: week.id, slug: slug(l.id + (slugs.length > 1 ? "-" + s : "")), title: l.title, summary: l.summary, content: `## What you will learn\n${(l.learn ?? []).map((x) => "- " + x).join("\n")}\n\n## Takeaways\n${(l.takeaways ?? []).map((x) => "- " + x).join("\n")}`, videoUrl: `https://videos.vaulten.app/${l.id}.mp4`, durationMinutes: l.minutes, xpReward: 25, position: lessons.filter((x) => x.weekId === week.id).length, minWatchPercent: i % 7 === 0 ? 80 : null, instructor: l.instructor, category: l.category, status: i % 11 === 0 ? "DRAFT" : "PUBLISHED", createdAt: daysAgo(100), updatedAt: daysAgo(i % 30) });
  });
});
const resourceIdMap = new Map();
const RTYPE = { Template: "TEMPLATE", Tool: "TOOL", Guide: "GUIDE", Checklist: "CHECKLIST", Script: "TEMPLATE", Calculator: "TOOL" };
mock.resources.forEach((r, i) => {
  const slugs = r.path === "all" ? paths.map((p) => p.slug) : [r.path];
  slugs.forEach((s) => {
    const p = pathBySlug(s); if (!p) return;
    const id = uid();
    if (s === slugs[0]) resourceIdMap.set(r.id, id);
    resources.push({ id, pathId: p.id, lessonId: null, type: RTYPE[r.type] ?? "GUIDE", title: r.title, slug: slug(r.id + (slugs.length > 1 ? "-" + s : "")), description: r.description, position: i, status: "PUBLISHED", createdAt: daysAgo(90), updatedAt: daysAgo(i % 20), sections: (r.sections ?? []).map((sec, j) => ({ id: uid(), resourceId: id, title: sec.heading, body: (sec.body ?? []).join("\n\n"), position: j, createdAt: daysAgo(90), updatedAt: daysAgo(90) })) });
  });
});
for (const [slugName, days] of Object.entries(mock.plans)) {
  const p = pathBySlug(slugName); if (!p) continue;
  const planId = uid();
  plans.push({ id: planId, pathId: p.id, title: `${p.name} — 30 days to first revenue`, description: `Daily missions for the ${p.name} path.`, durationDays: days.length, status: "PUBLISHED", createdAt: daysAgo(100), updatedAt: daysAgo(2), days: days.map((d) => ({ id: uid(), planId, dayNumber: d.day, title: d.theme ?? d.missionTitle, objective: d.goal ?? "", createdAt: daysAgo(100), updatedAt: daysAgo(100), tasks: (d.tasks ?? []).map((t, j) => ({ id: uid(), title: t.title, description: t.description ?? "", type: j === 0 && d.lessonId ? "LESSON" : t.resourceId ? "RESOURCE" : /prospect|outreach|contact|message/i.test(t.title) ? "PROSPECTING" : "ACTION", linkedLessonId: j === 0 && d.lessonId ? lessonIdMap.get(d.lessonId) ?? null : null, linkedResourceId: t.resourceId ? resourceIdMap.get(t.resourceId) ?? null : null, xpReward: Math.round((d.xp ?? 100) / Math.max((d.tasks ?? []).length, 1)), isRequired: j < 2, position: j, status: "PUBLISHED", createdAt: daysAgo(100), updatedAt: daysAgo(100) })) })) });
}
plans.forEach((pl) => pl.days.forEach((d) => { d.dayId = d.id; d.tasks.forEach((t) => (t.dayId = d.id)); }));

// Onboarding from mock.onboarding.steps
const categories = [];
{
  const catA = { id: uid(), title: "About you", description: "Who you are and what you bring.", position: 0, status: "PUBLISHED", questions: [], createdAt: daysAgo(100), updatedAt: daysAgo(100) };
  const catB = { id: uid(), title: "Your situation", description: "Time, budget and comfort.", position: 1, status: "PUBLISHED", questions: [], createdAt: daysAgo(100), updatedAt: daysAgo(100) };
  const catC = { id: uid(), title: "Your goal", description: "What you want out of the next 30 days.", position: 2, status: "PUBLISHED", questions: [], createdAt: daysAgo(100), updatedAt: daysAgo(100) };
  categories.push(catA, catB, catC);
  (mock.onboarding.steps ?? []).forEach((st, i) => {
    const cat = i < 4 ? catA : i < 8 ? catB : catC;
    const type = st.kind === "text" ? "TEXT" : st.kind === "multi" ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";
    const qid = uid();
    cat.questions.push({ id: qid, categoryId: cat.id, key: st.key, prompt: st.title, helpText: st.subtitle ?? null, type, isRequired: true, minValue: null, maxValue: null, position: cat.questions.length, status: "PUBLISHED", options: (st.options ?? []).map((o, j) => ({ id: uid(), questionId: qid, label: o.value, value: slug(o.value), position: j, weights: paths.map((p) => ({ pathId: p.id, points: Math.floor(rand() * 4) })) })), createdAt: daysAgo(100), updatedAt: daysAgo(100) });
  });
}
const rules = [
  { id: uid(), questionKey: "budget", operator: "EQUALS", value: "0", effect: "BOOST_PATH", pathId: paths[0].id, points: 3, reason: null, priority: 10, status: "PUBLISHED", createdAt: daysAgo(50), updatedAt: daysAgo(50) },
  { id: uid(), questionKey: "comfort", operator: "EQUALS", value: "not-comfortable", effect: "EXCLUDE_PATH", pathId: paths[1].id, points: 0, reason: "This path needs phone calls with business owners.", priority: 20, status: "PUBLISHED", createdAt: daysAgo(50), updatedAt: daysAgo(50) },
];

const templates = mock.templates.map((t, i) => ({ id: uid(), pathId: t.path === "all" ? null : pathBySlug(t.path)?.id ?? null, channel: pick(["EMAIL", "INSTAGRAM_DM", "SMS", "LINKEDIN"]), title: t.title, body: t.body.replace(/\{name\}/g, "{{contactName}}").replace(/\{business\}/g, "{{businessName}}"), position: i, status: "PUBLISHED", stage: t.stage, createdAt: daysAgo(80), updatedAt: daysAgo(i) }));
const criteria = ["Business name matches the storefront", "Primary category is correct", "Phone number answers", "Website link works", "Opening hours filled in", "At least 10 photos", "Responds to reviews", "Posts in the last 30 days", "Q&A section used", "Services / menu listed"].map((label, i) => ({ id: uid(), label, description: i % 3 === 0 ? "Check it on Google Maps on a phone." : null, points: 10, position: i, status: i === 9 ? "DRAFT" : "PUBLISHED", createdAt: daysAgo(70), updatedAt: daysAgo(i) }));

const prospects = [];
const deals = [];
const payments = [];

const audit = [];
function logAudit(actor, action, targetType, targetId, metadata = {}) {
  audit.unshift({ id: uid(), occurredAt: now(), action, actorId: actor?.id ?? null, actorRole: actor?.role ?? null, targetType, targetId, requestId: "req_" + uid().slice(0, 8), metadata });
}

// Content documents (extension): versioned JSON the app reads.
const content = new Map();
function seedDoc(key, value, description) {
  content.set(key, { key, description, version: 1, value, updatedAt: daysAgo(30), updatedBy: adminUser.id, versions: [{ version: 1, value: JSON.parse(JSON.stringify(value)), updatedAt: daysAgo(30), updatedBy: adminUser.id, note: "seed" }] });
}
seedDoc("journeys", journeys, "Journey catalog: earning methods, niches, metrics, monetization stages, content stages, journey questions.");
seedDoc("coach", mock.coach, "Coach: suggested prompts, scripted replies, tips, fallback.");
seedDoc("mentor-check", mock.mentorCheck, "Mentor check: red / green flags, questions, verdicts.");
seedDoc("achievements", mock.achievements, "Achievements and their targets.");
seedDoc("help", mock.help, "Help center: FAQs, topics, problem categories.");
seedDoc("subscription", mock.subscription, "Paywall plans and benefits.");
seedDoc("pricing", mock.pricing, "Pricing calculator options.");
seedDoc("generator-options", mock.generatorOptions, "Outreach generator: services, tones, goals.");
seedDoc("lesson-categories", mock.lessonCategories, "Lesson categories shown in the library.");
seedDoc("onboarding-ui", { analysisSteps: mock.onboarding.analysisSteps, mascotLines: Object.fromEntries((mock.onboarding.steps ?? []).map((s) => [s.key, s.mascotLine])) }, "Onboarding UI copy: analysis steps and mascot lines.");

const notifications = [];
let maintenance = { enabled: false, message: "", until: null, updatedAt: null };
const watched = new Map();

// ---------------------------------------------------------------- helpers
function problem(status, code, detail, extra = {}) {
  return { status, body: { type: `https://api.vaulten.com/errors/${code.toLowerCase()}`, title: code.replace(/_/g, " "), status, code, detail, requestId: "req_" + uid().slice(0, 8), ...extra } };
}
const ok = (data, meta) => ({ status: 200, body: meta ? { data, meta } : { data } });
function paginate(items, q) {
  const page = Math.max(1, Number(q.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") || 25)));
  const start = (page - 1) * pageSize;
  return ok(items.slice(start, start + pageSize), { page, pageSize, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) });
}
const strip = (o, hidden = []) => { const c = { ...o }; for (const h of hidden) delete c[h]; return c; };
const lessonOut = (l) => strip(l, []);
const resourceOut = (r, withSections) => { const c = strip(r, ["sections"]); if (withSections) c.sections = r.sections; return c; };
const planOut = (p, withDays) => ({ ...strip(p, ["days"]), days: withDays ? p.days : [] });
function bump(o) { o.updatedAt = now(); return o; }
function transition(list, id, status, actor, type) {
  const o = list.find((x) => x.id === id); if (!o) return problem(404, "NOT_FOUND", `${type} not found.`);
  o.status = status; bump(o); logAudit(actor, `${type}.${status.toLowerCase()}`, type, id, {});
  return ok(o);
}
function patch(o, body, allowed, actor, type) {
  const before = {}, after = {};
  for (const k of allowed) if (k in body) { before[k] = o[k]; o[k] = body[k]; after[k] = body[k]; }
  bump(o); logAudit(actor, `${type}.updated`, type, o.id, { before, after });
  return ok(o);
}
const ROLE_RANK = { USER: 0, SUPPORT: 1, CONTENT_MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 };

// analytics (extension)
function analytics(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5); const key = d.toISOString().slice(0, 10);
    const base = 40 + Math.sin(i / 5) * 12 + rand() * 20;
    out.push({ date: key, sessions: Math.round(base * 3), events: Math.round(base * 11), signups: Math.round(rand() * 6), lessonsCompleted: Math.round(base * 0.8), tasksCompleted: Math.round(base * 1.4), paymentsCents: Math.round(rand() * 40000), firstRevenue: rand() > 0.8 ? 1 : 0, coachMessages: Math.round(base * 2) });
  }
  return out;
}

// ---------------------------------------------------------------- routes
const routes = [];
const on = (method, pattern, handler, { auth = true, minRole = "SUPPORT" } = {}) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, "(?<$1>[^/]+)") + "$"), handler, auth, minRole });

// auth
on("POST", "/auth/login", ({ body }) => {
  const u = users.find((x) => x.email === String(body.email ?? "").toLowerCase());
  if (!u || passwords.get(u.email) !== body.password) return problem(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  if (u.accountStatus === "SUSPENDED") return problem(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
  if (u.role !== "USER") { const t = enc("mfa", u.id); return ok({ mfaRequired: true, accessToken: null, tokenType: null, accessTokenExpiresAt: null, refreshToken: null, refreshTokenExpiresAt: null, user: null, mfaToken: t, mfaTokenExpiresAt: new Date(Date.now() + 3e5).toISOString() }); }
  return ok({ mfaRequired: false, ...session(u) });
}, { auth: false });
function session(u) { const t = enc("at", u.id), r = enc("rt", u.id); return { accessToken: t, tokenType: "Bearer", accessTokenExpiresAt: new Date(Date.now() + 9e5).toISOString(), refreshToken: r, refreshTokenExpiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role } }; }
on("POST", "/auth/mfa/verify", ({ body }) => { const id = mfaTokens.get(body.mfaToken); if (!id) return problem(401, "MFA_TOKEN_INVALID", "The MFA challenge is invalid or expired."); if (body.code !== MFA_CODE) return problem(401, "MFA_CODE_INVALID", "Wrong code. The mock accepts 000000."); mfaTokens.delete(body.mfaToken); return ok(session(users.find((u) => u.id === id))); }, { auth: false });
on("POST", "/auth/refresh", ({ body }) => { const id = refreshTokens.get(body?.refreshToken); if (!id) return problem(401, "UNAUTHENTICATED", "Refresh token invalid."); refreshTokens.delete(body.refreshToken); return ok(session(users.find((u) => u.id === id))); }, { auth: false });
on("POST", "/auth/logout", ({ token }) => { sessions.delete(token); return { status: 204 }; }, { minRole: "USER" });
on("POST", "/auth/logout-all", () => ({ status: 204 }), { minRole: "USER" });
on("GET", "/users/me", ({ actor }) => ok(strip(actor, ["updatedAt"])), { minRole: "USER" });

// users
on("GET", "/admin/users", ({ q }) => {
  const s = (q.get("q") ?? "").toLowerCase().trim(); const digits = s.replace(/\D/g, "");
  let list = users.filter((u) => !s || u.email.includes(s) || `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(s) || u.id.includes(s) || (digits && u.id.replace(/\D/g, "").includes(digits)));
  if (q.get("role")) list = list.filter((u) => u.role === q.get("role"));
  if (q.get("status")) list = list.filter((u) => u.accountStatus === q.get("status"));
  list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(list, q);
});
on("GET", "/admin/users/:userId", ({ p }) => { const u = users.find((x) => x.id === p.userId); return u ? ok(u) : problem(404, "USER_NOT_FOUND", "User not found."); });
on("POST", "/admin/users/:userId/suspend", ({ p, actor }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); if (u.id === actor.id) return problem(422, "BUSINESS_RULE_VIOLATION", "You cannot suspend yourself."); if (ROLE_RANK[u.role] >= ROLE_RANK[actor.role]) return problem(403, "FORBIDDEN", "You cannot act on an equal or higher role."); u.accountStatus = "SUSPENDED"; bump(u); for (const [t, id] of sessions) if (id === u.id) sessions.delete(t); logAudit(actor, "user.suspended", "user", u.id, {}); return ok(u); }, { minRole: "ADMIN" });
on("POST", "/admin/users/:userId/reactivate", ({ p, actor }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); u.accountStatus = "ACTIVE"; bump(u); logAudit(actor, "user.reactivated", "user", u.id, {}); return ok(u); }, { minRole: "ADMIN" });
on("PATCH", "/admin/users/:userId/role", ({ p, body, actor }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); if (u.id === actor.id) return problem(422, "BUSINESS_RULE_VIOLATION", "You cannot change your own role."); if (!(body.role in ROLE_RANK)) return problem(422, "VALIDATION_FAILED", "Unknown role.", { errors: [{ field: "role", code: "INVALID_VALUE", message: "Unknown role" }] }); const before = u.role; u.role = body.role; bump(u); logAudit(actor, "user.role_changed", "user", u.id, { before: { role: before }, after: { role: u.role } }); return ok(u); }, { minRole: "SUPER_ADMIN" });
// extension: edit profile, force logout, export
on("PATCH", "/admin/users/:userId", ({ p, body, actor }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); return patch(u, body, ["firstName", "lastName", "timeZone", "email", "adminNote"], actor, "user"); }, { minRole: "ADMIN" });
on("POST", "/admin/users/:userId/logout-all", ({ p, actor }) => { for (const [t, id] of sessions) if (id === p.userId) sessions.delete(t); logAudit(actor, "user.sessions_revoked", "user", p.userId, {}); return { status: 204 }; });
on("POST", "/admin/users/:userId/password-reset", ({ p, actor }) => { logAudit(actor, "user.password_reset_sent", "user", p.userId, {}); return ok({ accepted: true }); });
on("DELETE", "/admin/users/:userId", ({ p, actor, headers }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); if (headers["x-confirm"] !== u.email) return problem(422, "CONFIRMATION_MISMATCH", "Type the user's email to confirm."); u.accountStatus = "DELETED"; u.email = `deleted-${u.id.slice(0, 8)}@anon.invalid`; u.firstName = null; u.lastName = null; bump(u); logAudit(actor, "user.anonymized", "user", u.id, {}); return ok(u); }, { minRole: "ADMIN" });
on("GET", "/admin/users/:userId/export", ({ p }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); return { status: 200, raw: JSON.stringify({ user: u, prospects: prospects.filter((x) => x.userId === u.id), deals: deals.filter((x) => x.userId === u.id), payments: payments.filter((x) => x.userId === u.id) }, null, 2), headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="user-${u.id}.json"` } }; }, { minRole: "ADMIN" });
on("GET", "/admin/users/:userId/lesson-progress", ({ p }) => ok([...(watched.get(p.userId)?.entries() ?? [])].map(([lessonId, w]) => ({ lessonId, title: lessons.find((l) => l.id === lessonId)?.title ?? lessonId, ...w }))));
on("GET", "/admin/progress/users/:userId", ({ p }) => { const u = users.find((x) => x.id === p.userId); if (!u) return problem(404, "USER_NOT_FOUND", "User not found."); const demo = u.id === demoUser.id; return ok({ totalXp: demo ? 1250 : Math.floor(rand() * 600), level: demo ? 4 : 1, levelStartXp: demo ? 1000 : 0, nextLevelXp: demo ? 1800 : 200, currentStreak: demo ? 7 : Math.floor(rand() * 4), longestStreak: demo ? 7 : 4, lastActiveOn: daysAgo(0).slice(0, 10), lessonsCompleted: demo ? 9 : Math.floor(rand() * 5), mission: demo ? { userMissionPlanId: uid(), planId: plans[0].id, status: "ACTIVE", currentDay: 7, durationDays: 30, daysCompleted: 6, tasksCompleted: 22 } : null, checkedInThisWeek: demo, prospectsContacted: demo ? 18 : 0, prospectsReplied: demo ? 4 : 0, revenue: { amountCents: demo ? 15000 : 0, currency: "USD" }, firstRevenueReached: demo }); });
on("GET", "/admin/prospects", ({ q }) => paginate(prospects.filter((x) => x.userId === q.get("userId")), q));
on("GET", "/admin/prospects/:id", ({ p }) => { const pr = prospects.find((x) => x.id === p.id); return pr ? ok({ prospect: pr, notes: [], contactEvents: [], audits: [] }) : problem(404, "NOT_FOUND", "Prospect not found."); });
on("GET", "/admin/deals", ({ q }) => paginate(deals.filter((x) => x.userId === q.get("userId")), q));
on("GET", "/admin/payments", ({ q }) => paginate(payments.filter((x) => x.userId === q.get("userId")), q));

// staff
on("POST", "/admin/staff/invitations", ({ body, actor }) => { if (!/@/.test(body.email ?? "")) return problem(422, "VALIDATION_FAILED", "Invalid email.", { errors: [{ field: "email", code: "INVALID_FORMAT", message: "Invalid email" }] }); logAudit(actor, "staff.invited", "user", body.email, { role: body.role }); return ok({ invitationId: uid(), email: body.email.toLowerCase(), role: body.role, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(), token: uid() }); }, { minRole: "SUPER_ADMIN" });
on("POST", "/admin/staff/:userId/mfa/reset", ({ p, actor }) => { logAudit(actor, "staff.mfa_reset", "user", p.userId, {}); return { status: 204 }; }, { minRole: "SUPER_ADMIN" });
on("GET", "/admin/audit-logs", ({ q }) => { let list = audit; for (const k of ["actorId", "action", "targetType", "targetId"]) if (q.get(k)) list = list.filter((a) => String(a[k] ?? "").toLowerCase().includes(q.get(k).toLowerCase())); if (q.get("occurredAfter")) list = list.filter((a) => a.occurredAt >= q.get("occurredAfter")); if (q.get("occurredBefore")) list = list.filter((a) => a.occurredAt <= q.get("occurredBefore")); return paginate(list, q); });

// settings & flags
on("GET", "/admin/settings", () => ok(settings));
on("PATCH", "/admin/settings/:key", ({ p, body, actor }) => { const s = settings.find((x) => x.key === p.key); if (!s) return problem(404, "SETTING_NOT_FOUND", "Unknown setting."); const v = body.value; const t = s.type; const bad = (t === "number" && typeof v !== "number") || (t === "boolean" && typeof v !== "boolean") || (t === "string" && typeof v !== "string") || (t === "number[]" && !(Array.isArray(v) && v.every((x) => typeof x === "number"))) || (t === "object[]" && !(Array.isArray(v) && v.every((x) => x && typeof x === "object"))); if (bad) return problem(422, "VALIDATION_FAILED", `Value must be of type ${t}.`, { errors: [{ field: "value", code: "INVALID_VALUE", message: `Expected ${t}` }] }); const before = s.value; s.value = v; s.updatedAt = now(); logAudit(actor, "setting.updated", "setting", s.key, { before: { value: before }, after: { value: v } }); return ok(s); }, { minRole: "ADMIN" });
on("GET", "/admin/feature-flags", () => ok(flags));
on("PATCH", "/admin/feature-flags/:key", ({ p, body, actor }) => { const f = flags.find((x) => x.key === p.key); if (!f) return problem(404, "FLAG_NOT_FOUND", "Unknown flag."); const before = f.enabled; f.enabled = !!body.enabled; f.updatedAt = now(); logAudit(actor, "feature_flag.toggled", "feature_flag", f.key, { before: { enabled: before }, after: { enabled: f.enabled } }); return ok(f); }, { minRole: "ADMIN" });

// paths
on("GET", "/admin/paths", () => ok(paths));
on("POST", "/admin/paths", ({ body, actor }) => { if (paths.some((p) => p.slug === body.slug)) return problem(409, "CONFLICT", "Slug already used."); const p = { id: uid(), slug: body.slug, name: body.name, tagline: body.tagline, description: body.description, position: paths.length, tools: [], status: "DRAFT", createdAt: now(), updatedAt: now() }; paths.push(p); logAudit(actor, "path.created", "path", p.id, {}); return ok(p); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/paths/:pathId", ({ p }) => { const x = paths.find((y) => y.id === p.pathId); return x ? ok({ ...x, weeks: weeks.filter((w) => w.pathId === x.id).sort((a, b) => a.position - b.position) }) : problem(404, "PATH_NOT_FOUND", "Path not found."); });
on("PATCH", "/admin/paths/:pathId", ({ p, body, actor }) => { const x = paths.find((y) => y.id === p.pathId); return x ? patch(x, body, ["name", "tagline", "description", "position"], actor, "path") : problem(404, "PATH_NOT_FOUND", "Path not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/paths/:pathId/publish", ({ p, actor }) => transition(paths, p.pathId, "PUBLISHED", actor, "path"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/paths/:pathId/archive", ({ p, actor }) => transition(paths, p.pathId, "ARCHIVED", actor, "path"), { minRole: "CONTENT_MANAGER" });
on("PUT", "/admin/paths/:pathId/tools", ({ p, body, actor }) => { const x = paths.find((y) => y.id === p.pathId); if (!x) return problem(404, "PATH_NOT_FOUND", "Path not found."); return patch(x, { tools: body.tools }, ["tools"], actor, "path"); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/paths/:pathId/weeks", ({ p, body, actor }) => { const w = { id: uid(), pathId: p.pathId, number: body.number, title: body.title, objective: body.objective, position: weeks.filter((x) => x.pathId === p.pathId).length, createdAt: now(), updatedAt: now() }; weeks.push(w); logAudit(actor, "path_week.created", "path_week", w.id, {}); return ok(w); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/paths/:pathId/weeks/:weekId", ({ p, body, actor }) => { const w = weeks.find((x) => x.id === p.weekId); return w ? patch(w, body, ["number", "title", "objective", "position"], actor, "path_week") : problem(404, "NOT_FOUND", "Week not found."); }, { minRole: "CONTENT_MANAGER" });

// lessons
on("GET", "/admin/learning/lessons", ({ q }) => { let list = lessons; if (q.get("weekId")) list = list.filter((l) => l.weekId === q.get("weekId")); else if (q.get("pathId")) list = list.filter((l) => l.pathId === q.get("pathId")); const s = (q.get("q") ?? "").toLowerCase(); if (s) list = list.filter((l) => l.title.toLowerCase().includes(s) || l.slug.includes(s)); if (q.get("status")) list = list.filter((l) => l.status === q.get("status")); return ok(list.map(lessonOut)); });
on("POST", "/admin/learning/lessons", ({ body, actor }) => { const l = { id: uid(), pathId: body.pathId, weekId: body.weekId, slug: body.slug, title: body.title, summary: body.summary, content: body.content ?? "", videoUrl: body.videoUrl ?? null, durationMinutes: body.durationMinutes ?? null, xpReward: body.xpReward ?? 25, minWatchPercent: body.minWatchPercent ?? null, position: lessons.filter((x) => x.weekId === body.weekId).length, status: "DRAFT", createdAt: now(), updatedAt: now() }; lessons.push(l); logAudit(actor, "lesson.created", "lesson", l.id, {}); return ok(l); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/learning/lessons/:id", ({ p }) => { const l = lessons.find((x) => x.id === p.id); return l ? ok(lessonOut(l)) : problem(404, "LESSON_NOT_FOUND", "Lesson not found."); });
on("PATCH", "/admin/learning/lessons/:id", ({ p, body, actor }) => { const l = lessons.find((x) => x.id === p.id); if (!l) return problem(404, "LESSON_NOT_FOUND", "Lesson not found."); if ("videoUrl" in body && body.videoUrl && !/^https?:\/\//.test(body.videoUrl)) return problem(422, "VALIDATION_FAILED", "Video URL must be absolute.", { errors: [{ field: "videoUrl", code: "INVALID_FORMAT", message: "Must start with http(s)://" }] }); return patch(l, body, ["title", "summary", "content", "videoUrl", "durationMinutes", "xpReward", "position", "minWatchPercent", "weekId"], actor, "lesson"); }, { minRole: "CONTENT_MANAGER" });
// Lesson videos: real YouTube search when YOUTUBE_API_KEY is set, otherwise an empty list.
const ytId = (u) => String(u ?? "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? null;
const isoDur = (d) => { const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
async function ytVideos(ids) {
  const key = process.env.YOUTUBE_API_KEY; if (!key || !ids.length) return [];
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${key}`); if (!r.ok) return [];
  return ((await r.json()).items ?? []).map((v) => ({ videoId: v.id, title: v.snippet.title, channelTitle: v.snippet.channelTitle, durationSeconds: isoDur(v.contentDetails.duration), thumbnailUrl: v.snippet.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, url: `https://www.youtube.com/watch?v=${v.id}` }));
}
on("GET", "/admin/videos", async ({ q }) => {
  const query = String(q.get("q") ?? "").trim(); if (!query || query.length > 200) return problem(400, "INVALID_QUERY", "The search query is missing or malformed.");
  const key = process.env.YOUTUBE_API_KEY; if (!key) return ok([]);
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=10&safeSearch=strict&videoEmbeddable=true&q=${encodeURIComponent(query)}&key=${key}`); if (!r.ok) return ok([]);
  return ok((await ytVideos(((await r.json()).items ?? []).map((i) => i.id.videoId))).filter((v) => v.durationSeconds >= 120));
});
on("PUT", "/admin/learning/lessons/:id/video", async ({ p, body, actor }) => {
  const l = lessons.find((x) => x.id === p.id); if (!l) return problem(404, "LESSON_NOT_FOUND", "Lesson not found.");
  if (body.url == null) { l.videoUrl = null; l.videoSnapshot = null; }
  else { const id = ytId(body.url); if (!id) return problem(400, "INVALID_VIDEO_URL", "The video must be a valid YouTube video URL.");
    const [v] = await ytVideos([id]); l.videoUrl = `https://www.youtube.com/watch?v=${id}`;
    l.videoSnapshot = v ? { title: v.title, channelTitle: v.channelTitle, durationSeconds: v.durationSeconds, thumbnailUrl: v.thumbnailUrl, fetchedAt: new Date().toISOString() } : { title: "YouTube video", channelTitle: "", durationSeconds: 0, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, fetchedAt: new Date().toISOString() }; }
  l.updatedAt = new Date().toISOString(); return ok(lessonOut(l));
}, { minRole: "CONTENT_MANAGER" });
// Stored video per app lesson (docs/api/lesson-videos.md). The mock "AI" takes the first result that passes the filter.
const lessonVideos = new Map([["clip-01", { lessonKey: "clip-01", videoId: "dQw4w9WgXcQ", title: "Sample stored video", channelTitle: "Mock channel", thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", durationSeconds: 600, source: "ai", reason: "Mock seed row.", pickedAt: new Date().toISOString(), checkedAt: new Date().toISOString() }]]);
const appVideo = (v) => ({ videoId: v.videoId, title: v.title, channelTitle: v.channelTitle, thumbnailUrl: v.thumbnailUrl, durationSeconds: v.durationSeconds });
const unfit = (v) => v.durationSeconds < 180 || v.durationSeconds > 1800 || / - topic$|vevo|records|music/i.test(v.channelTitle) || /music|lofi|lo-fi|beats|playlist|\bmix\b|lyrics|official (audio|video)|ambient|relaxing|sleep|song|album|asmr/i.test(v.title);
on("GET", "/lesson-videos", () => ok(Object.fromEntries([...lessonVideos].map(([k, v]) => [k, appVideo(v)]))));
on("GET", "/admin/lesson-videos", () => ok([...lessonVideos.values()]), { minRole: "CONTENT_MANAGER" });
on("PUT", "/admin/lesson-videos/:key", async ({ p, body }) => {
  const id = ytId(body.url); if (!id) return problem(400, "INVALID_VIDEO_URL", "The video must be a valid YouTube video URL.");
  const [v] = await ytVideos([id]); const now = new Date().toISOString();
  const row = { lessonKey: p.key, videoId: id, title: v?.title ?? "YouTube video", channelTitle: v?.channelTitle ?? "", thumbnailUrl: v?.thumbnailUrl ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, durationSeconds: v?.durationSeconds ?? 0, source: "admin", reason: null, pickedAt: now, checkedAt: now };
  lessonVideos.set(p.key, row); return ok(row);
}, { minRole: "CONTENT_MANAGER" });
on("DELETE", "/admin/lesson-videos/:key", ({ p }) => { lessonVideos.delete(p.key); return ok({ deleted: true }); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/lesson-videos/:key/ai-pick", async ({ p, body }) => {
  const cur = lessonVideos.get(p.key); const now = new Date().toISOString();
  if (cur?.source === "admin" && !body.force) return ok({ picked: cur, reason: "Set by an admin; kept.", query: "", considered: 0, replaced: false });
  const l = body.lesson ?? {}; const query = `${l.title ?? p.key} ${l.category ?? ""} tutorial for beginners`;
  const key = process.env.YOUTUBE_API_KEY; let found = [];
  if (key) { const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=10&videoDuration=medium&safeSearch=strict&videoEmbeddable=true&q=${encodeURIComponent(query)}&key=${key}`); if (r.ok) found = (await ytVideos(((await r.json()).items ?? []).map((i) => i.id.videoId))).filter((v) => !unfit(v)); }
  const v = found[0]; if (!v) return ok({ picked: cur ?? null, reason: key ? "Nothing fitting in the results." : "Mock has no YOUTUBE_API_KEY.", query, considered: found.length, replaced: false });
  const row = { lessonKey: p.key, videoId: v.videoId, title: v.title, channelTitle: v.channelTitle, thumbnailUrl: v.thumbnailUrl, durationSeconds: v.durationSeconds, source: "ai", reason: "Mock: first result that passed the filter.", pickedAt: now, checkedAt: now };
  lessonVideos.set(p.key, row); return ok({ picked: row, reason: row.reason, query, considered: found.length, replaced: !!cur && cur.videoId !== v.videoId });
}, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/learning/lessons/:id/publish", ({ p, actor }) => transition(lessons, p.id, "PUBLISHED", actor, "lesson"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/learning/lessons/:id/archive", ({ p, actor }) => transition(lessons, p.id, "ARCHIVED", actor, "lesson"), { minRole: "CONTENT_MANAGER" });

// resources
on("GET", "/admin/learning/resources", ({ q }) => { let list = resources; if (q.get("pathId")) list = list.filter((r) => r.pathId === q.get("pathId")); return ok(list.map((r) => resourceOut(r, false))); });
on("POST", "/admin/learning/resources", ({ body, actor }) => { const r = { id: uid(), pathId: body.pathId, lessonId: body.lessonId ?? null, type: body.type, title: body.title, slug: body.slug, position: resources.filter((x) => x.pathId === body.pathId).length, status: "DRAFT", createdAt: now(), updatedAt: now(), sections: [] }; resources.push(r); logAudit(actor, "resource.created", "resource", r.id, {}); return ok(resourceOut(r, false)); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/learning/resources/:id", ({ p }) => { const r = resources.find((x) => x.id === p.id); return r ? ok(resourceOut(r, true)) : problem(404, "NOT_FOUND", "Resource not found."); });
on("PATCH", "/admin/learning/resources/:id", ({ p, body, actor }) => { const r = resources.find((x) => x.id === p.id); if (!r) return problem(404, "NOT_FOUND", "Resource not found."); const res = patch(r, body, ["type", "title", "position", "lessonId", "description"], actor, "resource"); return ok(resourceOut(r, false)); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/learning/resources/:id/publish", ({ p, actor }) => { const r = transition(resources, p.id, "PUBLISHED", actor, "resource"); return r.body ? ok(resourceOut(r.body.data, false)) : r; }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/learning/resources/:id/archive", ({ p, actor }) => { const r = transition(resources, p.id, "ARCHIVED", actor, "resource"); return r.body ? ok(resourceOut(r.body.data, false)) : r; }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/learning/resources/:id/sections", ({ p, body, actor }) => { const r = resources.find((x) => x.id === p.id); if (!r) return problem(404, "NOT_FOUND", "Resource not found."); const s = { id: uid(), resourceId: r.id, title: body.title, body: body.body, position: r.sections.length, createdAt: now(), updatedAt: now() }; r.sections.push(s); logAudit(actor, "resource_section.created", "resource_section", s.id, {}); return ok(s); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/learning/resources/:id/sections/:sid", ({ p, body, actor }) => { const r = resources.find((x) => x.id === p.id); const s = r?.sections.find((x) => x.id === p.sid); if (!s) return problem(404, "NOT_FOUND", "Section not found."); return patch(s, body, ["title", "body", "position"], actor, "resource_section"); }, { minRole: "CONTENT_MANAGER" });
on("DELETE", "/admin/learning/resources/:id/sections/:sid", ({ p, actor }) => { const r = resources.find((x) => x.id === p.id); if (!r) return problem(404, "NOT_FOUND", "Resource not found."); r.sections = r.sections.filter((x) => x.id !== p.sid); logAudit(actor, "resource_section.deleted", "resource_section", p.sid, {}); return { status: 204 }; }, { minRole: "CONTENT_MANAGER" });

// missions
on("GET", "/admin/missions/plans", ({ q }) => ok(plans.filter((p) => !q.get("pathId") || p.pathId === q.get("pathId")).map((p) => planOut(p, false))));
on("POST", "/admin/missions/plans", ({ body, actor }) => { const p = { id: uid(), pathId: body.pathId, title: body.title, description: body.description, durationDays: 0, status: "DRAFT", days: [], createdAt: now(), updatedAt: now() }; plans.push(p); logAudit(actor, "mission_plan.created", "mission_plan", p.id, {}); return ok(planOut(p, false)); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/missions/plans/:id", ({ p }) => { const x = plans.find((y) => y.id === p.id); return x ? ok(planOut(x, true)) : problem(404, "NOT_FOUND", "Plan not found."); });
on("PATCH", "/admin/missions/plans/:id", ({ p, body, actor }) => { const x = plans.find((y) => y.id === p.id); if (!x) return problem(404, "NOT_FOUND", "Plan not found."); patch(x, body, ["title", "description"], actor, "mission_plan"); return ok(planOut(x, false)); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/plans/:id/publish", ({ p, actor }) => { const x = plans.find((y) => y.id === p.id); if (!x) return problem(404, "NOT_FOUND", "Plan not found."); plans.filter((o) => o.pathId === x.pathId && o.id !== x.id && o.status === "PUBLISHED").forEach((o) => (o.status = "ARCHIVED")); x.status = "PUBLISHED"; bump(x); logAudit(actor, "mission_plan.published", "mission_plan", x.id, {}); return ok(planOut(x, false)); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/plans/:id/archive", ({ p, actor }) => { const x = plans.find((y) => y.id === p.id); if (!x) return problem(404, "NOT_FOUND", "Plan not found."); x.status = "ARCHIVED"; bump(x); logAudit(actor, "mission_plan.archived", "mission_plan", x.id, {}); return ok(planOut(x, false)); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/plans/:id/days", ({ p, body, actor }) => { const x = plans.find((y) => y.id === p.id); if (!x) return problem(404, "NOT_FOUND", "Plan not found."); if (x.days.some((d) => d.dayNumber === body.dayNumber)) return problem(409, "CONFLICT", "Day number already exists."); const d = { id: uid(), planId: x.id, dayNumber: body.dayNumber, title: body.title, objective: body.objective, tasks: [], createdAt: now(), updatedAt: now() }; x.days.push(d); x.days.sort((a, b) => a.dayNumber - b.dayNumber); x.durationDays = x.days.length; logAudit(actor, "mission_day.created", "mission_day", d.id, {}); return ok(d); }, { minRole: "CONTENT_MANAGER" });
const findDay = (id) => { for (const pl of plans) { const d = pl.days.find((x) => x.id === id); if (d) return d; } return null; };
const findTask = (id) => { for (const pl of plans) for (const d of pl.days) { const t = d.tasks.find((x) => x.id === id); if (t) return t; } return null; };
on("PATCH", "/admin/missions/days/:id", ({ p, body, actor }) => { const d = findDay(p.id); return d ? patch(d, body, ["title", "objective"], actor, "mission_day") : problem(404, "NOT_FOUND", "Day not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/days/:id/tasks", ({ p, body, actor }) => { const d = findDay(p.id); if (!d) return problem(404, "NOT_FOUND", "Day not found."); const t = { id: uid(), dayId: d.id, title: body.title, description: body.description ?? "", type: body.type, linkedLessonId: body.linkedLessonId ?? null, linkedResourceId: body.linkedResourceId ?? null, xpReward: body.xpReward ?? 25, isRequired: body.isRequired ?? true, position: d.tasks.length, status: "PUBLISHED", createdAt: now(), updatedAt: now() }; d.tasks.push(t); logAudit(actor, "mission_task.created", "mission_task", t.id, {}); return ok(t); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/missions/tasks/:id", ({ p, body, actor }) => { const t = findTask(p.id); return t ? patch(t, body, ["title", "description", "xpReward", "isRequired", "position", "linkedLessonId", "linkedResourceId"], actor, "mission_task") : problem(404, "NOT_FOUND", "Task not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/tasks/:id/publish", ({ p, actor }) => { const t = findTask(p.id); if (!t) return problem(404, "NOT_FOUND", "Task not found."); t.status = "PUBLISHED"; bump(t); logAudit(actor, "mission_task.published", "mission_task", t.id, {}); return ok(t); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/missions/tasks/:id/archive", ({ p, actor }) => { const t = findTask(p.id); if (!t) return problem(404, "NOT_FOUND", "Task not found."); t.status = "ARCHIVED"; bump(t); logAudit(actor, "mission_task.archived", "mission_task", t.id, {}); return ok(t); }, { minRole: "CONTENT_MANAGER" });

// onboarding
const findQ = (id) => { for (const c of categories) { const q = c.questions.find((x) => x.id === id); if (q) return q; } return null; };
on("GET", "/admin/onboarding/questionnaire", () => ok(categories));
on("POST", "/admin/onboarding/categories", ({ body, actor }) => { const c = { id: uid(), title: body.title, description: body.description, position: categories.length, status: "DRAFT", questions: [], createdAt: now(), updatedAt: now() }; categories.push(c); logAudit(actor, "onboarding_category.created", "onboarding_category", c.id, {}); return ok(c); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/onboarding/categories/:id", ({ p, body, actor }) => { const c = categories.find((x) => x.id === p.id); return c ? patch(c, body, ["title", "description", "position"], actor, "onboarding_category") : problem(404, "NOT_FOUND", "Category not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/categories/:id/publish", ({ p, actor }) => transition(categories, p.id, "PUBLISHED", actor, "onboarding_category"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/categories/:id/archive", ({ p, actor }) => transition(categories, p.id, "ARCHIVED", actor, "onboarding_category"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/questions", ({ body, actor }) => { const c = categories.find((x) => x.id === body.categoryId); if (!c) return problem(404, "NOT_FOUND", "Category not found."); if (categories.some((cc) => cc.questions.some((q) => q.key === body.key))) return problem(409, "CONFLICT", "Question key already used."); const q = { id: uid(), categoryId: c.id, key: body.key, prompt: body.prompt, helpText: body.helpText ?? null, type: body.type, isRequired: body.isRequired ?? true, minValue: body.minValue ?? null, maxValue: body.maxValue ?? null, position: c.questions.length, status: "DRAFT", options: [], createdAt: now(), updatedAt: now() }; c.questions.push(q); logAudit(actor, "onboarding_question.created", "onboarding_question", q.id, {}); return ok(q); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/onboarding/questions/:id", ({ p, body, actor }) => { const q = findQ(p.id); return q ? patch(q, body, ["prompt", "helpText", "isRequired", "minValue", "maxValue", "position"], actor, "onboarding_question") : problem(404, "NOT_FOUND", "Question not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/questions/:id/publish", ({ p, actor }) => { const q = findQ(p.id); if (!q) return problem(404, "NOT_FOUND", "Question not found."); q.status = "PUBLISHED"; bump(q); logAudit(actor, "onboarding_question.published", "onboarding_question", q.id, {}); return ok(q); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/questions/:id/archive", ({ p, actor }) => { const q = findQ(p.id); if (!q) return problem(404, "NOT_FOUND", "Question not found."); q.status = "ARCHIVED"; bump(q); logAudit(actor, "onboarding_question.archived", "onboarding_question", q.id, {}); return ok(q); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/questions/:id/options", ({ p, body, actor }) => { const q = findQ(p.id); if (!q) return problem(404, "NOT_FOUND", "Question not found."); const o = { id: uid(), questionId: q.id, label: body.label, value: body.value, position: q.options.length, weights: [] }; q.options.push(o); bump(q); logAudit(actor, "onboarding_option.created", "onboarding_option", o.id, {}); return ok(o); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/onboarding/questions/:id/options/:oid", ({ p, body, actor }) => { const q = findQ(p.id); const o = q?.options.find((x) => x.id === p.oid); if (!o) return problem(404, "NOT_FOUND", "Option not found."); for (const k of ["label", "position"]) if (k in body) o[k] = body[k]; bump(q); logAudit(actor, "onboarding_option.updated", "onboarding_option", o.id, { after: body }); return ok(o); }, { minRole: "CONTENT_MANAGER" });
on("PUT", "/admin/onboarding/questions/:id/options/:oid/weights", ({ p, body, actor }) => { const q = findQ(p.id); const o = q?.options.find((x) => x.id === p.oid); if (!o) return problem(404, "NOT_FOUND", "Option not found."); o.weights = (body.weights ?? []).map((w) => ({ pathId: w.pathId, points: Number(w.points) })); bump(q); logAudit(actor, "onboarding_option.weights_set", "onboarding_option", o.id, { after: o.weights }); return ok(o); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/onboarding/rules", () => ok(rules));
on("POST", "/admin/onboarding/rules", ({ body, actor }) => { const r = { id: uid(), questionKey: body.questionKey, operator: body.operator, value: body.value, effect: body.effect, pathId: body.pathId, points: body.effect === "BOOST_PATH" ? body.points ?? 0 : 0, reason: body.reason ?? null, priority: body.priority ?? 0, status: "DRAFT", createdAt: now(), updatedAt: now() }; rules.push(r); logAudit(actor, "onboarding_rule.created", "onboarding_rule", r.id, {}); return ok(r); }, { minRole: "CONTENT_MANAGER" });
on("PUT", "/admin/onboarding/rules/:id", ({ p, body, actor }) => { const r = rules.find((x) => x.id === p.id); if (!r) return problem(404, "NOT_FOUND", "Rule not found."); Object.assign(r, { questionKey: body.questionKey, operator: body.operator, value: body.value, effect: body.effect, pathId: body.pathId, points: body.effect === "BOOST_PATH" ? body.points ?? 0 : 0, reason: body.reason ?? null, priority: body.priority ?? 0 }); bump(r); logAudit(actor, "onboarding_rule.replaced", "onboarding_rule", r.id, {}); return ok(r); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/rules/:id/publish", ({ p, actor }) => transition(rules, p.id, "PUBLISHED", actor, "onboarding_rule"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/rules/:id/archive", ({ p, actor }) => transition(rules, p.id, "ARCHIVED", actor, "onboarding_rule"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/onboarding/preview", ({ body }) => {
  const scores = new Map(paths.map((p) => [p.id, { pathId: p.id, slug: p.slug, name: p.name, score: 0, contributions: [] }]));
  const excluded = [], blocked = [];
  for (const a of body.answers ?? []) { const q = categories.flatMap((c) => c.questions).find((x) => x.key === a.questionKey); if (!q) continue; for (const v of a.options ?? []) { const o = q.options.find((x) => x.value === v); if (!o) continue; for (const w of o.weights) { const s = scores.get(w.pathId); if (s) { s.score += w.points; s.contributions.push({ source: "ANSWER", questionKey: q.key, optionValue: o.value, optionLabel: o.label, ruleId: null, points: w.points }); } } } }
  for (const r of rules.filter((x) => x.status === "PUBLISHED").sort((a, b) => b.priority - a.priority)) { const a = (body.answers ?? []).find((x) => x.questionKey === r.questionKey); if (!a) continue; const vals = a.options ?? (a.number !== undefined ? [String(a.number)] : [a.text]); const hit = r.operator === "EQUALS" ? vals.includes(r.value) : r.operator === "NOT_EQUALS" ? !vals.includes(r.value) : r.operator === "INCLUDES" ? vals.includes(r.value) : r.operator === "NOT_INCLUDES" ? !vals.includes(r.value) : (() => { const n = Number(vals[0]), t = Number(r.value); return r.operator === "GT" ? n > t : r.operator === "GTE" ? n >= t : r.operator === "LT" ? n < t : n <= t; })(); if (!hit) continue; const s = scores.get(r.pathId); if (!s) continue; if (r.effect === "BOOST_PATH") { s.score += r.points; s.contributions.push({ source: "RULE", questionKey: r.questionKey, optionValue: null, optionLabel: null, ruleId: r.id, points: r.points }); } else { (r.effect === "BLOCK_PATH" ? blocked : excluded).push({ pathId: s.pathId, slug: s.slug, name: s.name, questionKey: r.questionKey, reason: r.reason }); scores.delete(r.pathId); } }
  const ranked = [...scores.values()].sort((a, b) => b.score - a.score);
  return ok({ recommended: ranked[0] ?? null, ranked, excluded, blocked, algorithmVersion: 2 });
});

// outreach + gbp
on("GET", "/admin/outreach-templates", ({ q }) => ok(templates.filter((t) => (!q.get("pathId") || t.pathId === q.get("pathId")) && (!q.get("channel") || t.channel === q.get("channel")) && (!q.get("status") || t.status === q.get("status")))));
on("POST", "/admin/outreach-templates", ({ body, actor }) => { const t = { id: uid(), pathId: body.pathId ?? null, channel: body.channel, title: body.title, body: body.body, position: body.position ?? templates.length, status: "DRAFT", createdAt: now(), updatedAt: now() }; templates.push(t); logAudit(actor, "outreach_template.created", "outreach_template", t.id, {}); return ok(t); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/outreach-templates/:id", ({ p }) => { const t = templates.find((x) => x.id === p.id); return t ? ok(t) : problem(404, "NOT_FOUND", "Template not found."); });
on("PATCH", "/admin/outreach-templates/:id", ({ p, body, actor }) => { const t = templates.find((x) => x.id === p.id); return t ? patch(t, body, ["pathId", "channel", "title", "body", "position"], actor, "outreach_template") : problem(404, "NOT_FOUND", "Template not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/outreach-templates/:id/publish", ({ p, actor }) => transition(templates, p.id, "PUBLISHED", actor, "outreach_template"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/outreach-templates/:id/archive", ({ p, actor }) => transition(templates, p.id, "ARCHIVED", actor, "outreach_template"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/outreach-templates/:id/preview", ({ p, body }) => { const t = templates.find((x) => x.id === p.id); if (!t) return problem(404, "NOT_FOUND", "Template not found."); const render = (s) => { const missing = []; const text = s.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (body[k]) return body[k]; missing.push(k); return `{{${k}}}`; }); return { text, missingPlaceholders: missing }; }; return ok({ templateId: t.id, channel: t.channel, title: render(t.title), body: render(t.body) }); });
on("GET", "/admin/gbp-audit-criteria", ({ q }) => ok(criteria.filter((c) => !q.get("status") || c.status === q.get("status"))));
on("POST", "/admin/gbp-audit-criteria", ({ body, actor }) => { const c = { id: uid(), label: body.label, description: body.description ?? null, points: body.points, position: body.position ?? criteria.length, status: "DRAFT", createdAt: now(), updatedAt: now() }; criteria.push(c); logAudit(actor, "gbp_criterion.created", "gbp_criterion", c.id, {}); return ok(c); }, { minRole: "CONTENT_MANAGER" });
on("PATCH", "/admin/gbp-audit-criteria/:id", ({ p, body, actor }) => { const c = criteria.find((x) => x.id === p.id); return c ? patch(c, body, ["label", "description", "points", "position"], actor, "gbp_criterion") : problem(404, "NOT_FOUND", "Criterion not found."); }, { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/gbp-audit-criteria/:id/publish", ({ p, actor }) => transition(criteria, p.id, "PUBLISHED", actor, "gbp_criterion"), { minRole: "CONTENT_MANAGER" });
on("POST", "/admin/gbp-audit-criteria/:id/archive", ({ p, actor }) => transition(criteria, p.id, "ARCHIVED", actor, "gbp_criterion"), { minRole: "CONTENT_MANAGER" });

// ---- extensions
on("GET", "/admin/analytics/overview", ({ q }) => {
  const days = Math.min(365, Math.max(7, Number(q.get("days") || 30)));
  const series = analytics(days);
  const since = daysAgo(days), prev = daysAgo(days * 2);
  const newUsers = users.filter((u) => u.createdAt >= since).length, prevUsers = users.filter((u) => u.createdAt >= prev && u.createdAt < since).length;
  const trend = (cur, before) => (before < 5 ? null : ((cur - before) / before) * 100);
  const sum = (k) => series.reduce((s, d) => s + d[k], 0);
  return ok({ days, totals: { users: users.length, newUsers, newUsersTrend: trend(newUsers, prevUsers), activeUsers24h: 61, activeUsers7d: 230, sessions: sum("sessions"), events: sum("events"), lessonsCompleted: sum("lessonsCompleted"), tasksCompleted: sum("tasksCompleted"), paymentsCents: sum("paymentsCents"), firstRevenueUsers: sum("firstRevenue"), coachMessages: sum("coachMessages"), openSupport: 3 }, byStatus: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "DELETED"].map((s) => ({ label: s, value: users.filter((u) => u.accountStatus === s).length })), byPath: paths.map((p, i) => ({ label: p.name, value: i === 0 ? 118 : 71 })), funnel: [{ label: "Signed up", value: users.length }, { label: "Onboarded", value: 162 }, { label: "Day 1 done", value: 121 }, { label: "Day 7 done", value: 58 }, { label: "First revenue", value: 19 }], topLessons: lessons.slice(0, 6).map((l, i) => ({ label: l.title, value: 90 - i * 11 })), series, recentSignups: users.filter((u) => u.role === "USER").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25) });
});
on("GET", "/admin/content", () => ok([...content.values()].map((d) => strip(d, ["versions", "value"]))));
on("GET", "/admin/content/:key", ({ p }) => { const d = content.get(p.key); return d ? ok(strip(d, ["versions"])) : problem(404, "NOT_FOUND", "Unknown content document."); });
on("PUT", "/admin/content/:key", ({ p, body, actor }) => { const d = content.get(p.key); if (!d) return problem(404, "NOT_FOUND", "Unknown content document."); if (body.baseVersion !== undefined && body.baseVersion !== d.version) return problem(409, "VERSION_CONFLICT", `Document is at version ${d.version}; you edited version ${body.baseVersion}. Reload and retry.`); d.version += 1; d.value = body.value; d.updatedAt = now(); d.updatedBy = actor.id; d.versions.unshift({ version: d.version, value: JSON.parse(JSON.stringify(body.value)), updatedAt: d.updatedAt, updatedBy: actor.id, note: body.note ?? null }); logAudit(actor, "content.updated", "content", d.key, { version: d.version, note: body.note ?? null }); return ok(strip(d, ["versions"])); }, { minRole: "CONTENT_MANAGER" });
on("GET", "/admin/content/:key/versions", ({ p }) => { const d = content.get(p.key); return d ? ok(d.versions.map((v) => strip(v, ["value"]))) : problem(404, "NOT_FOUND", "Unknown content document."); });
on("GET", "/admin/content/:key/versions/:v", ({ p }) => { const d = content.get(p.key); const v = d?.versions.find((x) => x.version === Number(p.v)); return v ? ok(v) : problem(404, "NOT_FOUND", "Version not found."); });
on("POST", "/admin/content/:key/rollback", ({ p, body, actor }) => { const d = content.get(p.key); const v = d?.versions.find((x) => x.version === Number(body.version)); if (!v) return problem(404, "NOT_FOUND", "Version not found."); d.version += 1; d.value = JSON.parse(JSON.stringify(v.value)); d.updatedAt = now(); d.updatedBy = actor.id; d.versions.unshift({ version: d.version, value: JSON.parse(JSON.stringify(v.value)), updatedAt: d.updatedAt, updatedBy: actor.id, note: `rollback to v${v.version}` }); logAudit(actor, "content.rolled_back", "content", d.key, { to: v.version }); return ok(strip(d, ["versions"])); }, { minRole: "ADMIN" });
on("GET", "/admin/notifications", ({ q }) => paginate(notifications, q));
on("POST", "/admin/notifications/broadcast", ({ body, actor }) => { const n = { id: uid(), type: body.type ?? "announcement", title: body.title, body: body.body, link: body.link ?? null, audience: body.audience ?? "all", userId: null, status: body.scheduledAt ? "scheduled" : "sent", sentAt: body.scheduledAt ?? now(), createdBy: actor.id, recipients: users.filter((u) => u.accountStatus === "ACTIVE" && u.role === "USER").length }; notifications.unshift(n); logAudit(actor, "notification.broadcast", "notification", n.id, { recipients: n.recipients }); return ok(n); }, { minRole: "ADMIN" });
on("POST", "/admin/notifications/users/:userId", ({ p, body, actor }) => { const n = { id: uid(), type: body.type ?? "alert", title: body.title, body: body.body, link: body.link ?? null, audience: "user", userId: p.userId, status: "sent", sentAt: now(), createdBy: actor.id, recipients: 1 }; notifications.unshift(n); logAudit(actor, "notification.sent", "user", p.userId, {}); return ok(n); });
on("GET", "/admin/maintenance", () => ok(maintenance));
on("PUT", "/admin/maintenance", ({ body, actor }) => { maintenance = { enabled: !!body.enabled, message: body.message ?? "", until: body.until ?? null, updatedAt: now() }; logAudit(actor, "maintenance.updated", "maintenance", "global", { after: maintenance }); return ok(maintenance); }, { minRole: "ADMIN" });
on("GET", "/admin/system/health", () => ok({ status: "ok", version: "mock-1.0.0", uptimeSeconds: Math.round(process.uptime()), counts: { users: users.length, paths: paths.length, lessons: lessons.length, resources: resources.length, plans: plans.length, templates: templates.length, auditLogs: audit.length } }));
on("GET", "/admin/exports/:what.csv", ({ p }) => { const rows = p.what === "users" ? users.map((u) => [u.id, u.email, u.firstName ?? "", u.lastName ?? "", u.role, u.accountStatus, u.createdAt]) : p.what === "audit" ? audit.map((a) => [a.id, a.occurredAt, a.action, a.actorId ?? "", a.targetType ?? "", a.targetId ?? ""]) : p.what === "lessons" ? lessons.map((l) => [l.id, l.slug, l.title, l.status, l.videoUrl ?? "", l.minWatchPercent ?? ""]) : null; if (!rows) return problem(404, "NOT_FOUND", "Unknown export."); const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"); return { status: 200, raw: csv, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${p.what}.csv"` } }; }, { minRole: "ADMIN" });

// ---- support messages (extension): iOS "Contact us" / "Report a problem" → admin inbox
const supportCustomers = [
  { first: "Test", last: "Customer-A", email: "test.customer.a@example.com", plan: "pro_monthly", journey: "clipping" },
  { first: "Test", last: "Customer-B", email: "test.customer.b@example.com", plan: "free", journey: "gbp" },
  { first: "Test", last: "Customer-C", email: "test.customer.c@example.com", plan: "pro_yearly", journey: "youtube_owned" },
].map((c, i) => { const u = { id: uid(), email: c.email, firstName: c.first, lastName: c.last, timeZone: "Europe/Paris", role: "USER", accountStatus: "ACTIVE", createdAt: daysAgo(40 - i * 10), updatedAt: daysAgo(2) }; users.push(u); return { user: u, plan: c.plan, journey: c.journey }; });
const supportMessages = [];
let ticketSeq = 1040;
const supportSeed = [
  { c: 0, kind: "problem", category: "Missions", message: "Day 6 mission stays locked even though I finished every task of day 5 yesterday. (Sample message, not a real user.)", status: "open", days: 0.2, device: "iPhone17,1", os: "26.0", app: "1.2.0" },
  { c: null, kind: "contact", category: null, email: "someone@example.com", message: "Hi, is there a student discount for the yearly plan? (Sample message, not a real user.)", status: "open", days: 0.8, device: "iPhone15,2", os: "18.6", app: "1.2.0" },
  { c: 1, kind: "problem", category: "Video", message: "The lesson video freezes at 40% so I can't reach the watch threshold. (Sample message, not a real user.)", status: "replied", days: 2, device: "iPhone16,2", os: "26.0", app: "1.1.3", reply: "Thanks for the report. A fix ships in 1.2.0, please update and try again." },
  { c: 2, kind: "contact", category: "Billing", message: "I was charged twice this month, can you check? (Sample message, not a real user.)", status: "closed", days: 6, device: "iPhone17,3", os: "26.0", app: "1.2.0", reply: "We refunded the duplicate charge; it will show in 3-5 business days." },
];
for (const s of supportSeed) {
  const c = s.c === null ? null : supportCustomers[s.c];
  const createdAt = daysAgo(s.days);
  const m = { id: uid(), ticketNumber: ++ticketSeq, clientId: uid(), kind: s.kind, category: s.category, email: c?.user.email ?? s.email, message: s.message, status: s.status, appVersion: s.app, platform: "ios", device: s.device, osVersion: s.os, userId: c?.user.id ?? null, createdAt, updatedAt: createdAt, lastReplyAt: null, replies: [] };
  if (s.reply) { const at = daysAgo(s.days - 0.1); m.replies.push({ id: uid(), body: s.reply, authorId: users[2].id, authorName: "Jordan Lee", createdAt: at }); m.lastReplyAt = at; m.updatedAt = at; }
  supportMessages.push(m);
}
const supportRate = new Map(); // device/IP → timestamps (last hour)
const supportOut = (m) => strip(m, ["replies", "clientId"]);
const supportUser = (m) => { const u = users.find((x) => x.id === m.userId); if (!u) return null; const c = supportCustomers.find((x) => x.user.id === u.id); return { id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email, email: u.email, plan: c?.plan ?? null, journey: c?.journey ?? null, accountStatus: u.accountStatus, createdAt: u.createdAt }; };
on("POST", "/support/messages", ({ body, token, headers }) => {
  const actorId = sessions.get(token) ?? null;
  const existing = body.clientId && supportMessages.find((x) => x.clientId === body.clientId);
  if (existing) return { status: 201, body: { data: { id: existing.id, ticketNumber: existing.ticketNumber, status: existing.status, createdAt: existing.createdAt } } };
  const errors = [];
  if (!["contact", "problem"].includes(body.kind)) errors.push({ field: "kind", code: "INVALID_VALUE", message: "Must be contact or problem" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email ?? ""))) errors.push({ field: "email", code: "INVALID_FORMAT", message: "Invalid email" });
  if (String(body.message ?? "").trim().length < 10) errors.push({ field: "message", code: "TOO_SHORT", message: "At least 10 characters" });
  if (errors.length) return problem(422, "VALIDATION_FAILED", "The message could not be sent.", { errors });
  const key = String(body.device ?? "") + "|" + String(headers["x-forwarded-for"] ?? "local");
  const recent = (supportRate.get(key) ?? []).filter((t) => t > Date.now() - 36e5);
  if (recent.length >= 5) return problem(429, "RATE_LIMITED", "Too many messages. Try again in an hour.");
  supportRate.set(key, [...recent, Date.now()]);
  const m = { id: uid(), ticketNumber: ++ticketSeq, clientId: body.clientId ?? uid(), kind: body.kind, category: body.category ?? null, email: String(body.email).toLowerCase(), message: String(body.message).trim(), status: "open", appVersion: body.appVersion ?? null, platform: body.platform ?? "ios", device: body.device ?? null, osVersion: body.osVersion ?? null, userId: actorId ?? body.userId ?? null, createdAt: now(), updatedAt: now(), lastReplyAt: null, replies: [] };
  supportMessages.unshift(m);
  return { status: 201, body: { data: { id: m.id, ticketNumber: m.ticketNumber, status: m.status, createdAt: m.createdAt } } };
}, { auth: false });
on("GET", "/admin/support/messages", ({ q }) => {
  const s = (q.get("q") ?? "").toLowerCase().trim();
  let list = supportMessages.filter((m) => (!q.get("status") || m.status === q.get("status")) && (!q.get("kind") || m.kind === q.get("kind")) && (!s || m.email.includes(s) || m.message.toLowerCase().includes(s) || String(m.ticketNumber).includes(s.replace(/^#/, ""))));
  list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const r = paginate(list.map(supportOut), q);
  r.body.meta.counts = { open: supportMessages.filter((m) => m.status === "open").length, replied: supportMessages.filter((m) => m.status === "replied").length, closed: supportMessages.filter((m) => m.status === "closed").length };
  return r;
});
on("GET", "/admin/support/messages/:id", ({ p }) => { const m = supportMessages.find((x) => x.id === p.id); return m ? ok({ ...supportOut(m), replies: m.replies, user: supportUser(m) }) : problem(404, "NOT_FOUND", "Support message not found."); });
on("POST", "/admin/support/messages/:id/replies", ({ p, body, actor }) => {
  const m = supportMessages.find((x) => x.id === p.id); if (!m) return problem(404, "NOT_FOUND", "Support message not found.");
  if (String(body.body ?? "").trim().length < 2) return problem(422, "VALIDATION_FAILED", "Reply is empty.", { errors: [{ field: "body", code: "REQUIRED", message: "Write a reply" }] });
  const r = { id: uid(), body: String(body.body).trim(), authorId: actor.id, authorName: [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.email, createdAt: now() };
  m.replies.push(r); m.lastReplyAt = r.createdAt; m.status = "replied"; bump(m);
  logAudit(actor, "support_message.replied", "support_message", m.id, { ticketNumber: m.ticketNumber, emailedTo: m.email });
  return { status: 201, body: { data: r } };
});
on("PATCH", "/admin/support/messages/:id", ({ p, body, actor }) => {
  const m = supportMessages.find((x) => x.id === p.id); if (!m) return problem(404, "NOT_FOUND", "Support message not found.");
  if (!["open", "replied", "closed"].includes(body.status)) return problem(422, "VALIDATION_FAILED", "Invalid status.", { errors: [{ field: "status", code: "INVALID_VALUE", message: "open, replied or closed" }] });
  const before = m.status; m.status = body.status; bump(m);
  logAudit(actor, "support_message.status_changed", "support_message", m.id, { before: { status: before }, after: { status: m.status } });
  return ok({ ...supportOut(m), replies: m.replies, user: supportUser(m) });
});

// ---------------------------------------------------------------- server
export async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const send = (r) => { if (r.raw !== undefined) { res.writeHead(r.status, r.headers); return res.end(r.raw); } if (!r.body) { res.writeHead(r.status); return res.end(); } res.writeHead(r.status, { "Content-Type": r.status >= 400 ? "application/problem+json" : "application/json" }); res.end(JSON.stringify(r.body)); };
  if (!url.pathname.startsWith(PREFIX)) return send(problem(404, "NOT_FOUND", "Unknown route (missing /api/v1 prefix?)."));
  const pathname = url.pathname.slice(PREFIX.length);
  let chunks = ""; for await (const c of req) chunks += c;
  let body = {}; try { body = chunks ? JSON.parse(chunks) : {}; } catch { return send(problem(400, "VALIDATION_FAILED", "Body is not valid JSON.")); }
  const route = routes.find((r) => r.method === req.method && r.re.test(pathname));
  if (!route) { const any = routes.find((r) => r.re.test(pathname)); return send(any ? problem(405, "METHOD_NOT_ALLOWED", "Method not allowed.") : problem(404, "NOT_FOUND", `No route for ${req.method} ${pathname}.`)); }
  const m = pathname.match(route.re);
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  let actor = null;
  if (route.auth) {
    const id = sessions.get(token); actor = users.find((u) => u.id === id);
    if (!actor) return send(problem(401, "UNAUTHENTICATED", "The access token is missing, invalid or expired."));
    if (ROLE_RANK[actor.role] < ROLE_RANK[route.minRole]) return send(problem(403, "FORBIDDEN", `This action needs the ${route.minRole} role or higher.`));
    if (maintenance.enabled && actor.role === "USER") return send(problem(503, "MAINTENANCE", maintenance.message || "Vaulten is under maintenance."));
  }
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  try { send(await route.handler({ p: m.groups ?? {}, q: url.searchParams, body, actor, token, headers: req.headers })); }
  catch (e) { console.error(e); send(problem(500, "INTERNAL_ERROR", e.message)); }
}
// Standalone: `node vaulten-mock.mjs`. On Vercel, api/index.js imports `handle` instead.
if (!process.env.VERCEL && !process.env.MOCK_EMBEDDED) {
  http.createServer(handle).listen(PORT, () => console.log(`Vaulten mock API on http://127.0.0.1:${PORT}${PREFIX}  (admin@vaulten.app / admin1234, MFA 000000)`));
}
