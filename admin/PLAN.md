# Vaulten Admin — build plan

Admin dashboard for the Vaulten iOS app. Everything a user sees in the app must be editable here.
Design reference: FinSet / Mindweave style — sidebar, KPI tiles, cards with tables, light + dark.

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · no component / chart library.
The browser only talks to `app/api/proxy`, which forwards to `API_URL` (the Vaulten API, `…/api/v1`).

## Module map (app feature → admin module → API)

| App feature (iOS)                         | Admin module                  | API today (`docs/api/vaulten-openapi.json`)            | Status |
|-------------------------------------------|-------------------------------|---------------------------------------------------------|--------|
| Accounts, sign-in, suspension             | Users                         | `/admin/users` list · get · suspend · reactivate · role | exists |
| Staff accounts, MFA                       | System → Staff                | `/admin/staff/invitations`, `/mfa/reset`                | exists |
| Who changed what                          | System → Audit log            | `/admin/audit-logs`                                     | exists |
| Limits, XP table, thresholds              | System → Settings             | `/admin/settings`                                       | exists |
| Feature on/off                            | System → Feature flags        | `/admin/feature-flags`                                  | exists |
| Paths (Clipping, GBP…) + weeks + tools    | Content → Paths               | `/admin/paths…`                                         | exists |
| Lessons (video, markdown, XP)             | Content → Lessons             | `/admin/learning/lessons…`                              | exists |
| Resources + sections                      | Content → Resources           | `/admin/learning/resources…`                            | exists |
| 30-day plan: days + tasks                 | Content → Mission plans       | `/admin/missions…`                                      | exists |
| Onboarding questionnaire + recommendation | Onboarding                    | `/admin/onboarding…` + preview                          | exists |
| Outreach templates                        | Outreach → Templates          | `/admin/outreach-templates…`                            | exists |
| GBP audit checklist                       | Outreach → GBP criteria       | `/admin/gbp-audit-criteria…`                            | exists |
| A user's progress / prospects / deals / payments | Users → detail tabs    | `/admin/progress/users/:id`, `/admin/prospects`, `/admin/deals`, `/admin/payments` | exists |
| **Video watch rule (≥ 50 % to skip)**     | Content → Lessons + Settings  | **missing** → extension `lessons.minWatchPercent`       | spec'd |
| Journeys catalog (earning methods, niches, metrics, monetization, content stages, journey questions) | Journeys | **missing** → `/admin/content/journeys` | spec'd |
| Coach (prompts, replies, tips)            | Coach                         | **missing** → `/admin/content/coach`                    | spec'd |
| Mentor check (flags, questions, verdicts) | Mentor check                  | **missing** → `/admin/content/mentor-check`             | spec'd |
| Achievements                              | Achievements                  | **missing** → `/admin/content/achievements`             | spec'd |
| Help & FAQ                                | Help                          | **missing** → `/admin/content/help`                     | spec'd |
| Subscription plans + benefits (paywall)   | Subscription                  | **missing** → `/admin/content/subscription`             | spec'd |
| Pricing calculator + outreach generator   | Pricing & generator           | **missing** → `/admin/content/pricing`, `/generator`    | spec'd |
| Notifications (broadcast / one user)      | Notifications                 | **missing** → `/admin/notifications…`                   | spec'd |
| Overview KPIs + charts                    | Overview / Analytics          | Vaulten API users + PostHog HogQL via `app/api/analytics` | done |
| Maintenance switch                        | System → Maintenance          | **missing** → `/admin/maintenance`                      | spec'd |

"spec'd" = contract written in `docs/api/admin-extensions.md` and implemented in `admin/mock-api`
so the dashboard is complete now; the Vaulten backend has to add those endpoints (its source is not in this repo).

## Video rule (the "50 % to skip" request)

- Global setting `lessons.minWatchPercent` (default 50) and `lessons.requireWatchToComplete` (default true).
- Per-lesson override `minWatchPercent` (null = use global). Editable in the lesson editor.
- The app reports progress with `POST /learning/lessons/:id/watch { watchedPercent }`; the server stores the
  max. `complete` and "skip the step" for a LESSON task are refused with `LESSON_NOT_WATCHED_ENOUGH` under the threshold.
- Admin sees per-user watched % in Users → Progress.

## Steps

1. Shell: proxy, auth (email + password + MFA), theme, sidebar, top bar, UI primitives, charts, mock API. ✅
2. Users (list, detail with every action and the per-user tabs), System (settings, flags, staff, audit). ✅
3. Content: Paths, Lessons (with video rule), Resources, Mission plans.
4. Onboarding (categories, questions, options, weights, rules, live preview).
5. Outreach (templates with preview, GBP criteria).
6. Extension modules: Journeys, Coach, Mentor check, Achievements, Help, Subscription, Pricing, Notifications, Maintenance.
7. Overview + Analytics charts, CSV exports, final QA (typecheck, every page loads light + dark).

## Running

```bash
cd admin && npm install
npm run mock-api        # local upstream on :4310 seeded from the iOS mock data (admin@vaulten.app / admin1234, MFA code 000000)
API_URL=http://127.0.0.1:4310/api/v1 npm run dev   # dashboard on :3010
```

Against staging: `API_URL=https://api.vaulten-staging.jerseycollection.shop/api/v1 npm run dev`.
