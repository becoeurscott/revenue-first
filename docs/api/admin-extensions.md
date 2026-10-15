# Vaulten API — admin extensions required by the admin dashboard

The dashboard in `admin/` runs against `docs/api/vaulten-openapi.json`. Everything in the iOS app that
the current API does not expose is covered by the endpoints below. They follow the existing
conventions (bearer auth, `{ data, meta }` bodies, RFC 9457 errors, audit log on every write).
`admin/mock-api/vaulten-mock.mjs` implements all of them, so the dashboard is already complete; the
backend has to add them to go live.

Role tiers used below: `SUPPORT < CONTENT_MANAGER < ADMIN < SUPER_ADMIN`. Every GET is allowed from SUPPORT.

## 1. Lesson video watch rule (“watch ≥ 50 % to skip the step”)

| Change | Detail |
|---|---|
| Setting `lessons.minWatchPercent` (number, default 50) | Default share of the video that must be watched before a lesson can be completed, or a LESSON mission task skipped. |
| Setting `lessons.requireWatchToComplete` (boolean, default true) | Master switch for the rule. |
| Feature flag `video_watch_gate` | Same switch at flag level (kill switch without touching settings). |
| `Lesson.minWatchPercent: number \| null` | Per-lesson override, `null` = use the setting. Returned by every admin lesson response; accepted by `POST /admin/learning/lessons` and `PATCH /admin/learning/lessons/:id`. `PATCH` also accepts `weekId` (move a lesson to another week of the same path). |
| `LessonProgress.watchedPercent: number` (0–100) | Highest share reached. Returned in `LessonDetailResponseDto.progress`. |
| `POST /learning/lessons/:id/watch { watchedPercent }` | iOS reports progress (throttled, max wins). 200 → `LessonProgressResponseDto`. |
| `POST /learning/lessons/:id/complete` | 422 `LESSON_NOT_WATCHED_ENOUGH` `{ required, watched }` when under the threshold and the rule is on. |
| `POST /missions/tasks/:id/skip` | New. For a LESSON task with a video, same 422 under the threshold. Marks the task skipped (counts towards the day, no XP). |
| `GET /admin/users/:id/lesson-progress` | `[{ lessonId, title, watchedPercent, status, startedAt, completedAt }]` for the Users → Lessons tab. |

Resolution order for the threshold: flag off → no gate; setting `requireWatchToComplete=false` → no gate;
lesson without `videoUrl` → no gate; else `lesson.minWatchPercent ?? settings["lessons.minWatchPercent"]`.

## 2. Users

| Endpoint | Role | Notes |
|---|---|---|
| `PATCH /admin/users/:id` `{ firstName?, lastName?, email?, timeZone?, adminNote? }` | ADMIN | Allow-listed fields; audit before/after of the changed keys. `adminNote` is staff-only. |
| `POST /admin/users/:id/logout-all` | SUPPORT | Revokes every session and refresh token (bump token version). |
| `POST /admin/users/:id/password-reset` | SUPPORT | Sends the reset email; 200 `{ accepted: true }`. |
| `DELETE /admin/users/:id` with header `x-confirm: <email>` | ADMIN | Anonymize: erase PII, free the email, status `DELETED`. 422 `CONFIRMATION_MISMATCH` when the header differs. |
| `GET /admin/users/:id/export` | ADMIN | JSON file (`Content-Disposition: attachment`). |

## 3. Versioned content documents (everything the app still ships as JSON)

Generic store for `journeys`, `coach`, `mentor-check`, `achievements`, `help`, `subscription`, `pricing`,
`generator-options`, `lesson-categories`, `onboarding-ui`. The iOS app replaces its bundled files with `GET /content/:key`.

| Endpoint | Role | Notes |
|---|---|---|
| `GET /content/:key` | public (auth) | `{ key, version, value, updatedAt }` with `ETag: "<version>"`; apps send `If-None-Match`. |
| `GET /admin/content` | SUPPORT | List `{ key, description, version, updatedAt, updatedBy }`. |
| `GET /admin/content/:key` | SUPPORT | Full document. |
| `PUT /admin/content/:key` `{ value, baseVersion, note? }` | CONTENT_MANAGER | Validate `value` against the key's JSON schema; 409 `VERSION_CONFLICT` when `baseVersion ≠ current`. Creates version `n+1`, busts the public cache. |
| `GET /admin/content/:key/versions` | SUPPORT | `[{ version, updatedAt, updatedBy, note }]` newest first. |
| `GET /admin/content/:key/versions/:v` | SUPPORT | One version with its `value`. |
| `POST /admin/content/:key/rollback { version }` | ADMIN | Creates a new version with that content (history is never rewritten). |

## 4. Notifications

| Endpoint | Role | Notes |
|---|---|---|
| `POST /admin/notifications/broadcast` `{ type, title, body, link?, scheduledAt? }` | ADMIN | One inbox row per active USER + push. `scheduledAt` queues it. Returns `{ id, status: "sent" \| "scheduled", recipients, sentAt }`. |
| `POST /admin/notifications/users/:id` `{ type, title, body, link? }` | SUPPORT | One user. |
| `GET /admin/notifications?page&pageSize` | SUPPORT | History, newest first. |

## 5. Analytics, maintenance, system

| Endpoint | Role | Notes |
|---|---|---|
| `GET /admin/analytics/overview?days=7\|30\|90\|180\|365` | SUPPORT | `totals` (users, newUsers, newUsersTrend or `null` when the previous period < 5, activeUsers24h/7d, sessions, events, lessonsCompleted, tasksCompleted, paymentsCents, firstRevenueUsers, coachMessages, openSupport), `byStatus`, `byPath`, `funnel`, `topLessons`, `series` (one row per UTC day, computed with a single `GROUP BY date_trunc('day')`), `recentSignups` (25). The dashboard buckets by week / month client-side. |
| `GET /admin/maintenance` · `PUT /admin/maintenance { enabled, message, until }` | ADMIN | While enabled, every non-staff request gets 503 `MAINTENANCE` with the message; `until` auto-disables. |
| `GET /admin/system/health` | SUPPORT | `{ status, version, uptimeSeconds, counts }`. |
| `GET /admin/exports/users.csv` · `/audit.csv` · `/lessons.csv` | ADMIN | UTF-8 CSV with BOM, `Content-Disposition: attachment`. |

## 6. Small additions to existing endpoints

- `GET /admin/learning/lessons` also accepts `pathId` (all weeks) and `q`, `status`. `weekId` stays supported.
- `PATCH /admin/learning/resources/:id` accepts `lessonId` (attach / detach) and `description`.
- `DELETE /admin/learning/resources/:id/sections/:sectionId` (CONTENT_MANAGER, audited).
- `PATCH /admin/missions/tasks/:id` accepts `linkedLessonId` and `linkedResourceId`.
- `GET /admin/users` search `q` also matches the user id and digit-only phone numbers when phones are added.

## 7. Support messages (iOS “Contact us” / “Report a problem” → admin inbox)

The app's two support screens post to one public endpoint; staff read and answer them in the
dashboard's **Support inbox** (`admin/app/(dashboard)/support`).

**App endpoint**

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /support/messages` `{ kind: "contact" \| "problem", email, message, category?, appVersion, platform: "ios", device, osVersion, userId?, clientId }` | bearer **or anonymous** | Signed-out users can write in. When a token is present the server takes `userId` from it and ignores the body. 201 → `{ id, ticketNumber, status: "open", createdAt }`. Idempotent on `clientId` (a UUID the app generates per draft): a retry returns the original 201 body. 422 `VALIDATION_FAILED` (`message` < 10 chars, bad `email`, unknown `kind`); 429 `RATE_LIMITED` (5 per hour per device + IP). |

**Admin endpoints**

| Endpoint | Role | Notes |
|---|---|---|
| `GET /admin/support/messages?status=open\|replied\|closed&kind=&q=&page&pageSize` | SUPPORT | Newest first. `q` matches email, message text and `#ticketNumber`. `meta` adds `counts: { open, replied, closed }` (unfiltered) for the sidebar badge and tabs. A cursor (`cursor` / `meta.nextCursor`) is fine instead of pages once volume grows. |
| `GET /admin/support/messages/:id` | SUPPORT | Message + `replies: [{ id, body, authorId, authorName, createdAt }]` + `user: { id, name, email, plan, journey, accountStatus, createdAt } \| null` (null for anonymous senders). |
| `POST /admin/support/messages/:id/replies { body }` | SUPPORT | Emails the reply to `message.email` (reply-to: the support inbox), appends it to the thread, sets `status = replied`. Audited `support_message.replied`. 201 → the reply. |
| `PATCH /admin/support/messages/:id { status }` | SUPPORT | `open \| replied \| closed` (Close / Reopen). Audited `support_message.status_changed` with before/after. |

Message shape: `{ id, ticketNumber, kind, category, email, message, status, appVersion, platform, device, osVersion, userId, createdAt, updatedAt, lastReplyAt }`.

Suggested: on every new message, email the support inbox (e.g. `support@…`) with the ticket number,
kind, sender, the message and a link to the dashboard, so nothing waits for someone to open the inbox.
A user's reply to that email can later be threaded back via an inbound-mail webhook (out of scope here).
