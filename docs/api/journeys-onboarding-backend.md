# Vaulten API: journeys and the branching onboarding

The iOS app now adapts to how each person earns. The person picks an **earning method**, the onboarding branches on that choice, and the app enrolls them in a **journey**: plan, workspace, metrics, goals, coach and niche. Today only the two service journeys reach the server, through the old `/onboarding/*` path questionnaire. The other four exist only on the device, so they are lost on reinstall and invisible to the admin dashboard.

This document lists everything the backend needs so that **every journey is saved on the server**. Sections are ordered by priority: §1–§4 are needed just to save onboarding, §5–§8 make the rest of the app server-backed, and §9 covers the move from today's data.

Conventions follow `docs/api/admin-extensions.md`:

- bearer auth
- `{ data, meta }` response bodies
- RFC 9457 errors with a `code`
- an audit log on every admin write
- role tiers `SUPPORT < CONTENT_MANAGER < ADMIN < SUPER_ADMIN`

Field names match the Swift models in `ios/FirstRevenue/FirstRevenue/Models/Journey.swift`, so the app can decode responses without mapping. Dates are ISO 8601 UTC. IDs are opaque strings.

**Source of truth for content:** `ios/FirstRevenue/FirstRevenue/Resources/Data/journeys.json` (catalog plus onboarding questions) and one content file per track (`youtube_owned.json`, `digital_products.json`, `affiliate_content.json`, `creator_brand.json`; the service tracks live in `mock.json`). Seed the server from these files. Appendices A–C at the end are generated from them.

---

## 0. Words used in this document

| Term | Meaning | Values |
|---|---|---|
| Earning method / journey | How the person makes money. One journey per method. | `youtube_owned_channel`, `youtube_services`, `freelance_services`, `digital_products`, `affiliate_content`, `creator_brand` (plus `unknown`, which is never enrolled) |
| Track (path) | The content a journey runs on: the 30-day plan, lessons, resources and coach copy. This is the existing `Path`. | `clipping`, `gbp`, `youtube_owned`, `digital_products`, `affiliate_content`, `creator_brand` |
| Service journey | Sells a service to clients, so it uses prospects and deals. | `youtube_services` → `clipping`, `freelance_services` → `gbp` |
| Starting stage | Where the person starts, derived from their "status" answer. | `idea`, `started`, `some_traction`, `already_earning` |
| Niche profile | The single interpretation of the person's niche that every screen and the coach read (see §4). | — |
| Workspace | The board, numbers log and income tracker of a non-service journey. | — |
| Enrollment | One person on one journey, with their answers, niche, goal and progress. | — |

**Rule that must hold everywhere: never substitute.** If a request names a journey that is unknown or not active, return an error. Never fall back to another journey or to a service path.

---

## 1. Onboarding questions: new fields on the questionnaire

The existing `GET /onboarding/questionnaire` and the admin question CRUD stay. The question and option models gain these fields:

### 1.1 `OnboardingQuestion` additions

| Field | Type | Meaning |
|---|---|---|
| `kind` | `text` \| `single` \| `multi` \| `goal` | Maps to the existing `type`: `text` → TEXT, `single` → SINGLE_CHOICE, `multi` → MULTIPLE_CHOICE. `goal` is new: its options are the resolved journey's `goalOptions` (Appendix A), so the server returns no options of its own. |
| `icon` | string | SF Symbol name. The app uses no emoji, so reject emoji in this field. |
| `subtitle` | string | Line under the title. |
| `placeholder` | string \| null | For `text` questions. |
| `mascotLine` | string | What the mascot says on this step. |
| `methods` | `EarningMethod[]` \| null | Ask only for these journeys. `null` means ask everyone. |
| `showIf` | `{ key, anyOf?: string[], noneOf?: string[] }` \| null | Ask only when the earlier answer to `key` matches. `anyOf`: one of the picked values is in the list. `noneOf`: the question is answered and none of the picked values is in the list. |
| `variants` | `{ [EarningMethod]: { title?, subtitle?, placeholder?, options? } }` \| null | Per-journey rewording, or a different set of options. A missing field falls back to the base field. |
| `summary` | string \| null | Short label for the "Your setup" card (for example "Format"). `null` means not summarized. |
| `order` | int | Asking order (already exists as `position`). |
| `version` | int | Bumped on every edit; see §1.4. |

`title`, `subtitle` and `mascotLine` may contain `{name}`. The app fills it with the `name` answer, and the server returns it unfilled.

### 1.2 `OnboardingOption` additions

| Field | Type | Meaning |
|---|---|---|
| `icon` | string | SF Symbol name |
| `hint` | string \| null | Small grey line under the option |
| `stage` | `StartingStage` \| null | Set on the options of each journey's "status" question (`channelStatus`, `clientStatus`, `productStatus`, `affiliateStatus`, `creatorStatus`). Picking the option sets the enrollment's `startingStage`. |
| `planNote` | string \| null | One sentence on how this answer changes the plan. Shown on mission cards and sent to the AI as context. |

The existing option → path weights and rules can stay for service-path ranking. The new journeys do not use them, because the person picks their journey directly.

### 1.3 Built-in keys and answer storage

Keys stay `^[a-z][a-z0-9_]*$`. Existing keys in the app are camelCase (`earningMethod`, `youtubeMode`, `nicheDetail`…), so either relax the regex to `^[a-z][a-zA-Z0-9_]*$` (recommended, and nothing needs mapping) or snake_case them on the server and map them in the app.

These keys have a fixed meaning that the server must understand. Every other key is journey-specific and stored as-is.

| Key | Used for |
|---|---|
| `name` | Profile first name |
| `earningMethod` | One of `youtube` (needs `youtubeMode`), `freelance_services`, `digital_products`, `affiliate_content`, `creator_brand` |
| `youtubeMode` | `own_channel` → `youtube_owned_channel`; `services` → `youtube_services` |
| `niche`, `nicheDetail` | Niche raw input and the follow-up answer (§4) |
| `weeklyTime`, `budget`, `skills`, `equipment`, `location` | Constraints |
| `goal` | The label of one of the journey's `goalOptions` |

Answers keep the existing `AnswerInput` `{ questionKey, options[], number, text }`:

- `text` questions store `text`
- `single` and `multi` questions store `options[]` (option values)
- `goal` stores `options: [<goal label>]`

### 1.4 Branch-aware validation (change to existing endpoints)

Today `missingRequired` and `POST /onboarding/complete` treat every required question as required. With branching, only **applicable** questions count. A question applies when all three hold:

1. Its `methods` is null or includes the resolved journey (`earningMethod` plus `youtubeMode`, see §1.3; while the journey is unresolved, only questions with `methods = null` apply).
2. Its `showIf` holds against the current answers.
3. For `nicheDetail` only: the `niche` answer is too broad. The server can trust the app here, because the app sends `nicheDetail` when it asked it. Treat `nicheDetail` as optional.

Changes:

- `GET /onboarding/me` → `missingRequired` lists only applicable, unanswered required questions.
- `PUT /onboarding/answers`:
  - Reject keys that don't exist: 422 `UNKNOWN_QUESTION`.
  - Reject option values that are not allowed for the resolved journey (the variant's options when one exists): 422 `INVALID_OPTION`.
  - Accept answers to questions that do not apply, but ignore them.
  - When `earningMethod` or `youtubeMode` changes, **delete the stored answers to journey-specific questions that no longer apply**. The app does the same (`resetMethodAnswers`), so a person who switches from YouTube to Products doesn't keep a stale `videoFormat`.
- Store the `version` of each question that was answered, so later edits don't change the meaning of old answers.

### 1.5 `POST /onboarding/complete`: resolve to a journey (behaviour change)

Request: unchanged (empty body).

Response (new shape; keep `recommendation` for older app builds):

```json
{
  "data": {
    "journeyId": "digital_products",
    "journeyStatus": "active",
    "startingStage": "started",
    "goal": { "label": "Make my first sale", "metric": "salesCount", "target": 1 },
    "planNotes": ["You already have a draft, so Week 1 skips idea work."],
    "setupSummary": [{ "label": "Product", "value": "Templates" }],
    "recommendation": null
  }
}
```

Rules:

- Resolve the journey from `earningMethod` and `youtubeMode`. Before resolving, check `missingRequired` as above: 422 `ONBOARDING_INCOMPLETE { missing: [keys] }`.
- `youtube` without `youtubeMode`: 422 `JOURNEY_AMBIGUOUS`. Never pick one of the two.
- A journey that is `coming_soon`: 409 `JOURNEY_NOT_AVAILABLE { journeyId }`. The app offers the waitlist (§6.4). Never answer with another journey.
- For service journeys, `recommendation` may still carry the ranked path list, but `journeyId` decides the path.
- `startingStage`: the `stage` of the picked option of the journey's status question. If that answer is missing, use `idea`.
- `planNotes` and `setupSummary`: computed from the options' `planNote` and the questions' `summary`. The app computes them too, so these fields are optional.
- `complete` does **not** enroll the person. Enrollment is a separate, explicit step (§3).

---

## 2. Journey catalog

### 2.1 `GET /journeys` (public, cacheable)

Returns the full catalog exactly as `journeys.json` stores it (`JourneyCatalogBundle`):

```json
{ "data": {
  "catalogVersion": 3,
  "journeys": [ JourneyConfig, ... ],
  "metrics": { "videosPublished": MetricDef, ... },
  "monetization": [ MonetizationStageInfo, ... ],
  "universalLessonIds": [...], "universalResourceIds": [...],
  "broadNicheTerms": [...], "niches": [ CatalogNiche, ... ],
  "onboarding": [ JourneyQuestion, ... ]
} }
```

- `ETag: catalogVersion`, plus `If-None-Match` → 304.
- The app keeps the bundled file as an offline fallback.

The simplest option is to store the whole bundle as the `journeys` document of the versioned content store from admin-extensions §3 (draft, publish and rollback come for free). If onboarding questions live in their own tables (§1), assemble `onboarding` from those tables when building the response.

### 2.2 `JourneyConfig` (one per journey)

| Field | Type | Notes |
|---|---|---|
| `id` | EarningMethod | Primary key |
| `version` | int | Bump on any change that affects enrollments; enrollments record it |
| `status` | `active` \| `coming_soon` | |
| `label`, `shortLabel`, `description`, `icon`, `hue` | | Display |
| `track` | PathID \| null | The `Path.slug` that holds its plan. `null` while coming soon |
| `planId` | string \| null | Mission plan id (Appendix A) |
| `primaryAction` | string | Home's main button |
| `modules` | string[] | Feature switches: `prospects`, `deals`, `outreach`, `workspace`, `monetization`… |
| `metrics`, `checkinMetrics` | StatMetric[] | |
| `achievementIds` | string[] | |
| `monetizationStages` | string[] | IDs into `monetization` |
| `requiresProspects`, `requiresDeals` | bool | True only for the service journeys |
| `goalOptions` | `{ label, metric, target, money? }[]` | Appendix A |
| `quickActions` | string[] | |
| `workspace` | Workspace \| null | Copy and settings for the board, numbers and income tabs (see `Workspace` in Journey.swift). `null` for service journeys |

Validate on publish:

- Every `StatMetric` exists in `metrics`.
- `workspace.doneStage` is one of `workspace.stages`.
- Every `goalOptions.metric` and `milestones.metric` exists.
- `track` exists as a `Path`.

### 2.3 Paths, plans, lessons and resources for the 4 new tracks

Seed one `Path` per new track (`youtube_owned`, `digital_products`, `affiliate_content`, `creator_brand`) from the track files: `path` object, `lessonCategories`, `lessons`, `resources`, `achievements`, `coach`. Each track has 30 days, 30 lessons, 10 resources and 8 achievements.

Mission plans need two optional fields on `MissionDay`:

| Field | Type | Meaning |
|---|---|---|
| `nicheHint` | string \| null | How today's action applies to the person's niche. Contains `{niche}`, `{audience}`, `{problem}` and `{terms}`, which the app fills from the niche profile. Return it unfilled. |
| `stageHints` | `{ [StartingStage]: string }` \| null | Adjustment per starting stage |

Content scope: lessons and resources with `path: "all"` are written for client work. Return them only for service tracks. Non-service tracks get their own items plus the `universalLessonIds` and `universalResourceIds`.

---

## 3. Enrollments (replaces `choose-path` as the way in)

A person can hold one enrollment per journey. Exactly one enrollment is **active** at a time, and switching never deletes progress.

### 3.1 Table `journey_enrollments`

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `user_id` | FK | |
| `journey_id` | EarningMethod | **unique (user_id, journey_id)** |
| `journey_version` | int | From `JourneyConfig.version` at enrollment |
| `plan_id` | string | |
| `status` | `active` \| `paused` \| `completed` \| `abandoned` | **At most one `active` per user.** Use a partial unique index. |
| `starting_stage` | StartingStage | |
| `answers` | jsonb | `JourneyAnswers`: answers snapshot at enrollment (shape in §3.3) |
| `goal` | jsonb | `GoalOption` `{ label, metric, target, money? }` |
| `monetization_stage` | string | One of the journey's `monetizationStages`. The first one at start. |
| `started_at`, `completed_at` | timestamp | |
| `program` | jsonb \| null | `GeneratedProgram`, the personal AI plan (§7.2) |
| `program_unlocked` | bool | |
| `created_at`, `updated_at` | | |

Also add `user.active_enrollment_id` (or derive it from `status = active`).

### 3.2 Endpoints (user)

| Method & path | Body | Response | Errors |
|---|---|---|---|
| `POST /enrollments` | `{ journeyId, answers: JourneyAnswers, startingStage, goal: GoalOption, niche: NicheProfileInput }` | 201 `Enrollment` (now active; the previous active one becomes `paused`) | 400 `UNSUPPORTED_JOURNEY` (unknown or `unknown`), 409 `JOURNEY_NOT_AVAILABLE` (coming soon), 409 `ENROLLMENT_EXISTS { enrollmentId }` (use activate instead), 422 `INVALID_GOAL` (label not in `goalOptions`), 422 `ONBOARDING_INCOMPLETE` |
| `GET /enrollments` | — | `Enrollment[]` (all statuses, without heavy fields) | |
| `GET /enrollments/active` | — | `Enrollment` with niche, recent metric events and items | 404 `NO_ACTIVE_ENROLLMENT` (the app then shows onboarding) |
| `GET /enrollments/:id` | — | full `Enrollment` | 404 / 403 if not the owner |
| `POST /enrollments/:id/activate` | — | `Enrollment`. The previous active one becomes `paused`. This is "switch journey". | 409 if `completed` or `abandoned` (ask to restart) |
| `PATCH /enrollments/:id` | `{ goal?, monetizationStage?, status?: "paused" \| "abandoned", answers? }` | `Enrollment` | 422 `INVALID_GOAL`, 422 `INVALID_STAGE` |
| `POST /enrollments/:id/complete` | — | `Enrollment` with `completedAt` | |

For **service journeys**, `POST /enrollments` must also do what `POST /onboarding/choose-path` does today: create the path enrollment for `track` and start the mission plan. Keep `choose-path` working for older builds, and have it create or activate the matching journey enrollment internally (`clipping` → `youtube_services`, `gbp` → `freelance_services`).

`GET /paths/me/enrollment` should return the **active journey's** track.

### 3.3 `Enrollment` response

```json
{
  "id": "enr_123",
  "journeyId": "youtube_owned_channel",
  "journeyVersion": 2,
  "planId": "youtube-owned-30-day-v1",
  "status": "active",
  "startingStage": "started",
  "answers": {
    "earningMethod": "youtube_owned_channel",
    "youtubeMode": "own_channel",
    "niche": "home workouts", "nicheDetail": "",
    "startingStage": "started",
    "weeklyTime": "3-5h", "budget": "0", "skills": ["editing"], "equipment": ["phone"],
    "location": "", "goal": "Reach 100 subscribers",
    "extra": { "videoFormat": ["shorts"], "onCamera": ["voice_only"], "channelStatus": ["few_videos"] }
  },
  "goal": { "label": "Reach 100 subscribers", "metric": "subscribers", "target": 100 },
  "monetizationStage": "buildAudience",
  "nicheHistory": [ NicheContext, ... ],
  "completedDayNiche": { "1": 1, "2": 1, "5": 2 },
  "startedAt": "2026-10-01T09:00:00Z",
  "completedAt": null,
  "contentItems": [ ContentItem, ... ],
  "metricEvents": [ MetricEvent, ... ],
  "program": null,
  "programUnlocked": false
}
```

- `answers.extra` holds every journey-specific answer keyed by question key.
- `completedDayNiche` maps a day number (as a string key) to the niche version in force when that day was completed. Write it server-side when a mission day completes (§7.1).
- `contentItems` and `metricEvents` may be paginated or omitted on list endpoints. The detail endpoint returns the last 90 days of events.

### 3.4 Answer snapshot vs onboarding session

The onboarding session (`/onboarding/answers`) is the draft. `POST /enrollments` copies it into `enrollment.answers`.

Adding a second journey later (the app's "Add a journey" sheet asks only that journey's questions) calls `POST /enrollments` with the answers inline. The server must not require a new onboarding session for that.

---

## 4. Niche profiles

### 4.1 Table `niche_profiles` (versioned per enrollment)

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `enrollment_id` | FK | |
| `version` | int | 1, 2, 3… **unique (enrollment_id, version)**. The highest version is the current one. |
| `raw_input` | string ≤ 160 | "home workouts — for busy moms" |
| `normalized_label` | string ≤ 80 | |
| `audience`, `problem_or_desire` | string | |
| `allowed_claims`, `restricted_topics`, `example_terms`, `monetization_options` | string[] | |
| `caution_note` | string \| null | Set for health, finance, legal and similar niches |
| `source` | `catalog` \| `user_confirmed` \| `ai_generated` \| `generated` | |
| `created_at` | | |

Rows are **never updated or deleted**. A niche change inserts a new version, so completed days keep the niche they were done with.

### 4.2 Endpoints

| Method & path | Body | Response |
|---|---|---|
| `POST /niche-profiles/resolve` | `{ journeyId, niche, detail? }` | `{ nicheProfile: NicheContext & { tooBroad, followUpQuestion } }`. Does **not** save. This already exists as a Vercel function (`api/niche-profiles/resolve.ts`); move it behind Vaulten or proxy it with auth and rate limits. Errors: 400 `UNSUPPORTED_JOURNEY`, 429 `BUSY`, 422 `REFUSED`. |
| `GET /enrollments/:id/niche` | — | `{ current: NicheContext, history: NicheContext[] }` |
| `POST /enrollments/:id/niche` | `NicheProfileInput` (NicheContext without `version`) | 201 with the new `NicheContext`; the server assigns `version = max + 1`. The app's "Edit niche" uses it. |

`POST /enrollments` takes the first niche as `niche` and stores it as version 1.

Validation:

- `rawInput` must not be empty.
- On a service journey, `audience` describes the **client**, not viewers. The app already does this, so the server doesn't rewrite it.

---

## 5. Workspace data (non-service journeys)

### 5.1 Table `content_items` (the board)

| Column | Type | Notes |
|---|---|---|
| `id` | string | Client-generated UUIDs allowed (offline-first) |
| `enrollment_id` | FK | |
| `title` | string ≤ 120 | |
| `format` | string | One of `workspace.formats` (for example `Short`, `Template`) |
| `stage` | string | One of `workspace.stages[].stage` (Appendix A) |
| `notes` | text ≤ 2000 | |
| `link` | string ≤ 500 | URL or empty |
| `created_at`, `published_at` | | `published_at` is set the first time the item reaches `doneStage` |
| `deleted_at` | | Soft delete |

| Method & path | Body | Notes |
|---|---|---|
| `GET /enrollments/:id/items` | — | Sorted by `created_at` desc |
| `POST /enrollments/:id/items` | `{ id?, title, format, stage?, notes?, link? }` | `stage` defaults to the first stage. Idempotent on `id`. |
| `PATCH /items/:itemId` | any of title, format, stage, notes, link | Moving into `doneStage` the first time sets `published_at` **and inserts one `MetricEvent` `{ key: workspace.doneMetric, value: 1, refId: itemId }`**. Moving out of it again does not delete the event. This matches the app. |
| `DELETE /items/:itemId` | — | Soft delete; its events stay |

422 `INVALID_STAGE` / `INVALID_FORMAT` when a value is not in the journey's workspace.

### 5.2 Table `metric_events` (numbers and income)

| Column | Type | Notes |
|---|---|---|
| `id` | string | Client-generated allowed; idempotent |
| `enrollment_id` | FK | |
| `key` | StatMetric | Must be in `metrics` and not `kind: derived` |
| `value` | decimal | ≥ 0. Percent metrics are 0–100. |
| `date` | timestamp | Can be back-dated by up to 365 days; no future dates |
| `note` | string \| null | Income source ("Etsy", "Amazon Associates"…) |
| `ref_id` | string \| null | The content item or income entry that produced it |

| Method & path | Body | Notes |
|---|---|---|
| `GET /enrollments/:id/metrics?from=&to=` | — | Events |
| `POST /enrollments/:id/metrics` | `{ events: [{ id?, key, value, date?, note?, refId? }] }` | Batch (the numbers sheet logs several keys at once). 422 `INVALID_METRIC` for a derived key, or a key that is not one of the journey's `workspace.logMetrics` + `incomeMetric` + `salesMetric`. |
| `DELETE /metrics/:eventId` | — | Undo |
| `GET /enrollments/:id/stats` | — | `{ [StatMetric]: number }`, computed as below |

**Logging income** (the app's `logIncome(amount, source, sales)`) posts up to two events in one batch:

- `{ key: incomeMetric, value: amount, note: source }`
- if `sales > 0` and the journey has `salesMetric`: `{ key: salesMetric, value: sales }`

Both share the same `refId`.

**Computing stats** (must match `Stats.logged(from:)` in the app, Appendix B):

- `count` and `sum`: the sum of all event values for the key
- `latest`: the value of the most recent event by `date`
- `weekly`: the sum of the `of` key's events with `date` in the last 7 days
- `derived`: computed from other tables:
  - `missions`, `daysCompleted`, `streak` from mission progress
  - `lessons` from lesson progress
  - `prospects`, `contacted`, `replies`, `clients` from prospects
  - `revenue` from collected deals

---

## 6. Everything else that becomes journey-aware

### 6.1 Prospects and deals: service journeys only

Prospects, deals and outreach endpoints must return 409 `NOT_A_SERVICE_JOURNEY` when the active enrollment's journey has `requiresProspects = false`. This is the server-side guard for the "no Prospects for a YouTube channel" rule.

Add `enrollment_id` to prospects and deals (backfilled, §9), so switching between the two service journeys keeps their pipelines apart. The app already filters by track.

### 6.2 Weekly check-ins

Add to `WeeklyCheckin`:

| Field | Type | Meaning |
|---|---|---|
| `enrollmentId` | string | |
| `journeyId` | EarningMethod | Denormalized |
| `metrics` | `{ [StatMetric]: int }` \| null | The journey's `checkinMetrics` for that week (for example `{ "videosPublished": 2, "subscribers": 41 }`). Service journeys keep using `prospects` and `replies`. |
| `published` | int \| null | Workspace items finished this week |

`GET /progress/checkins` filters by the active enrollment by default; pass `?enrollmentId=` to read another one.

### 6.3 Achievements

Achievements are per track (from the track files). An achievement unlocks when the enrollment's stat for `metric` is ≥ `target`. Evaluate after each metric event, mission completion and deal change, and store unlocks with `enrollment_id`.

### 6.4 Waitlist for coming-soon journeys

| Method & path | Body | Notes |
|---|---|---|
| `POST /journeys/:journeyId/waitlist` | — | 204. Idempotent. 409 if the journey is already active. |
| `DELETE /journeys/:journeyId/waitlist` | — | 204 |
| `GET /me/waitlist` | — | `EarningMethod[]` |

When an admin flips a journey to `active`, notify the people on its waitlist through the existing notifications.

### 6.5 Coach conversations and AI context

- Add `journeyId` to coach conversations. Old rows are null and are treated as service journeys.
- Every AI request (`api/coach.ts`, `api/playbook.ts`, `api/program.ts`) now takes a `context`:

```json
{ "journeyId": "...", "niche": NicheContext, "startingStage": "...", "answers": { "...": "..." }, "goal": GoalOption, "monetizationStage": "..." }
```

When these move behind Vaulten, the server should build this context from the active enrollment instead of trusting the client, and return 400 `UNSUPPORTED_JOURNEY` for a journey without a methodology.

### 6.6 Notifications

Notification templates need a `journeyIds: EarningMethod[] | null` filter, so service reminders ("follow up with 3 prospects") never reach a channel or product person. Copy can use `{itemNoun}` from the workspace and the niche placeholders.

---

## 7. Missions and progress per enrollment

### 7.1 Mission progress

`GET /missions/current`, the day endpoints and `POST /missions/tasks/:id/complete` must work on the **active enrollment's** plan. Add `enrollment_id` to day and task progress, so each journey keeps its own Day N.

When a day completes, write `completedDayNiche[day] = current niche version` (§3.3).

`GET /progress/summary` and `GET /progress/xp` default to the active enrollment and accept `?enrollmentId=`. Total XP across journeys may stay global.

### 7.2 Personal program (`GeneratedProgram`)

Store the program as jsonb on the enrollment (`program`, `program_unlocked`).

| Method & path | Notes |
|---|---|
| `PUT /enrollments/:id/program` | Body: `GeneratedProgram`. Validation: days 1–7 for free accounts; days 8–30 only when the user has Premium (403 `PREMIUM_REQUIRED`). |
| `GET /enrollments/:id/program` | A free account gets days 1–7 only. **Never send the locked days**, not even hidden. |

A niche change rewrites days that are not done yet. Keep `nicheVersion` on the program.

---

## 8. Admin endpoints (dashboard in `admin/`)

| Endpoint | Role | Notes |
|---|---|---|
| `PUT /admin/content/journeys` `{ baseVersion, data }` | CONTENT_MANAGER | Whole catalog (admin-extensions §3). Validation as in §2.2. 409 `VERSION_CONFLICT`. |
| Existing question/option CRUD | CONTENT_MANAGER | Accept the new fields from §1.1 and §1.2. Validate that `methods` and `variants` keys are real journeys, that `showIf.key` references an **earlier** question, and that the options listed in `showIf` exist. |
| `POST /admin/onboarding/preview` | SUPPORT | Accept `answers` and return `{ journeyId, askedKeys[], missingRequired[], startingStage }`. This lets staff test a branch without a phone. |
| `GET /admin/users/:id/enrollments` | SUPPORT | All enrollments with status, niche history and stats |
| `GET /admin/users/:id/enrollments/:eid/metrics` | SUPPORT | |
| `POST /admin/users/:id/enrollments/:eid/activate` | ADMIN | Support fix; audited |
| `GET /admin/journeys/:id/waitlist` | SUPPORT | Count and export |
| `GET /admin/analytics/onboarding-funnel?from=&to=` | SUPPORT | Drop-off per question key, split by journey |

---

## 9. Migration from today's data

1. **Journeys and tracks.** Seed the catalog (§2) and the 4 new paths and plans (§2.3) from the JSON files. Seed the onboarding questions from `journeys.json` → `onboarding` in their listed order (Appendix C), replacing the old questionnaire categories for the app's build. Keep the old categories only if older builds still read them.
2. **Existing path enrollments → journey enrollments.** For every user with a path enrollment:
   - `clipping` → `youtube_services`; `gbp` → `freelance_services`
   - `status = active` for their current path, `paused` for others
   - `startingStage = idea` unless they have a won deal → `already_earning`
   - `goal`: the money goal closest to their `goalAmount` (Appendix A), or `$100`
   - `monetizationStage = ""` (service journeys have none)
   - `answers`: built from their old onboarding answers. Unknown keys go into `extra`; `earningMethod` and `youtubeMode` are filled from the path.
   - niche version 1: `source = generated`, `rawInput = normalizedLabel =` their old `interest` answer, or the path name
3. **Backfill `enrollment_id`** on mission progress, prospects, deals, check-ins and coach conversations from the user's enrollment for that path.
4. **Nothing is deleted.** The app performs the same migration locally (`Snapshot.migrate`), so a device and the server agree after the first sync.

---

## 10. Sync model for the app

The app is offline-first, so writes must be idempotent:

- Client-generated `id` on items, events and enrollments. A `POST` with an existing `id` returns the existing row with 200.
- `If-Match: updatedAt` on `PATCH /enrollments/:id`, returning 412 on conflict.
- `GET /enrollments/active?since=<timestamp>` returns only the items and events changed since then.

Order the app follows on a real account:

1. `PUT /onboarding/answers` after each step
2. `POST /onboarding/complete`
3. `POST /niche-profiles/resolve`
4. `POST /enrollments`
5. Later, numbers, items and check-ins as they happen

---

## 11. Error codes (new)

| Code | HTTP | When |
|---|---|---|
| `UNSUPPORTED_JOURNEY` | 400 | Unknown journey id, or `unknown` |
| `JOURNEY_AMBIGUOUS` | 422 | `youtube` picked without `youtubeMode` |
| `JOURNEY_NOT_AVAILABLE` | 409 | Journey is `coming_soon` |
| `ONBOARDING_INCOMPLETE` | 422 | Applicable required answers are missing; `{ missing: [keys] }` |
| `UNKNOWN_QUESTION` / `INVALID_OPTION` | 422 | Answer validation |
| `ENROLLMENT_EXISTS` | 409 | Already enrolled in that journey; `{ enrollmentId }` |
| `NO_ACTIVE_ENROLLMENT` | 404 | |
| `INVALID_GOAL` / `INVALID_STAGE` / `INVALID_FORMAT` / `INVALID_METRIC` | 422 | Value not in the journey's catalog |
| `NOT_A_SERVICE_JOURNEY` | 409 | Prospects, deals or outreach on a non-service journey |
| `PREMIUM_REQUIRED` | 403 | Program days 8–30 on a free account |
| `VERSION_CONFLICT` | 409 | Admin content write with a stale `baseVersion` |

Every enrollment, item, event and niche endpoint must check ownership: 404 when the enrollment is not the caller's. Never use 403 there, because it would reveal that the id exists.

---

## 12. Minimum to ship "save the onboarding flow"

If the backend can only do part of this now, this subset makes onboarding save for every journey:

1. §1.1–§1.4: new question fields plus branch-aware `missingRequired`
2. §1.5: `complete` returns `journeyId`
3. §3: the `journey_enrollments` table and `POST /enrollments`, `GET /enrollments/active`, `POST /enrollments/:id/activate`
4. §4: the `niche_profiles` table, written by `POST /enrollments` and `POST /enrollments/:id/niche`
5. §9 steps 1–2 for existing users

Workspace items and metric events (§5) come next. Until then they stay on the device, as they are today.

---
## Appendix A — Journeys

| journeyId | status | track (path slug) | planId | workspace done metric | weekly metric | income metric | monetization stages |
|---|---|---|---|---|---|---|---|
| `youtube_owned_channel` | active | `youtube_owned` | `youtube-owned-30-day-v1` | `videosPublished` | `uploadsThisWeek` | `channelIncome` | `buildAudience`, `affiliateOffers`, `sponsorshipReadiness`, `youtubePartnerProgram` |
| `youtube_services` | active | `clipping` | `clipping-30-day-v1` | prospects / deals (service) | — | `revenue` (deals) | — |
| `freelance_services` | active | `gbp` | `gbp-30-day-v1` | prospects / deals (service) | — | `revenue` (deals) | — |
| `digital_products` | active | `digital_products` | `digital-products-30-day-v1` | `productsLaunched` | `salesThisWeek` | `productRevenue` | `validateIdea`, `preSell`, `launch`, `grow` |
| `affiliate_content` | active | `affiliate_content` | `affiliate-content-30-day-v1` | `postsPublished` | `postsThisWeek` | `affiliateIncome` | `joinPrograms`, `firstCommission`, `doubleDown`, `diversify` |
| `creator_brand` | active | `creator_brand` | `creator-brand-30-day-v1` | `postsPublished` | `postsThisWeek` | `brandIncome` | `findVoice`, `stayConsistent`, `buildCommunity`, `brandDeals` |

### Goal options (the `goal` question's answers)

| journeyId | label (stored value) | metric | target | money |
|---|---|---|---|---|
| `youtube_owned_channel` | Publish my first 10 videos | `videosPublished` | 10 |  |
| `youtube_owned_channel` | Reach 100 subscribers | `subscribers` | 100 |  |
| `youtube_owned_channel` | Reach 1,000 subscribers | `subscribers` | 1000 |  |
| `youtube_owned_channel` | Earn my first $100 from the channel | `channelIncome` | 100 | yes |
| `youtube_services` | $50 | `revenue` | 50 | yes |
| `youtube_services` | $100 | `revenue` | 100 | yes |
| `youtube_services` | $250 | `revenue` | 250 | yes |
| `youtube_services` | $500 | `revenue` | 500 | yes |
| `youtube_services` | $1,000+ | `revenue` | 1000 | yes |
| `freelance_services` | $50 | `revenue` | 50 | yes |
| `freelance_services` | $100 | `revenue` | 100 | yes |
| `freelance_services` | $250 | `revenue` | 250 | yes |
| `freelance_services` | $500 | `revenue` | 500 | yes |
| `freelance_services` | $1,000+ | `revenue` | 1000 | yes |
| `digital_products` | Make my first sale | `salesCount` | 1 |  |
| `digital_products` | Earn my first $100 | `productRevenue` | 100 | yes |
| `digital_products` | Get 10 sales | `salesCount` | 10 |  |
| `digital_products` | Build an email list of 100 | `emailSubscribers` | 100 |  |
| `affiliate_content` | Publish 10 helpful posts | `postsPublished` | 10 |  |
| `affiliate_content` | Get 100 link clicks | `linkClicks` | 100 |  |
| `affiliate_content` | Earn my first $10 in commissions | `affiliateIncome` | 10 | yes |
| `affiliate_content` | Earn my first $100 | `affiliateIncome` | 100 | yes |
| `creator_brand` | Post 20 times this month | `postsPublished` | 20 |  |
| `creator_brand` | Reach 500 followers | `followers` | 500 |  |
| `creator_brand` | Reach 1,000 followers | `followers` | 1000 |  |
| `creator_brand` | Earn my first $50 from a brand | `brandIncome` | 50 | yes |

### Workspace board stages (in order)

| journeyId | stages | done stage |
|---|---|---|
| `youtube_owned_channel` | `idea` → `researched` → `scripted` → `recorded` → `edited` → `published` | `published` |
| `digital_products` | `idea` → `validated` → `outlined` → `created` → `listed` → `launched` | `launched` |
| `affiliate_content` | `idea` → `researched` → `drafted` → `linked` → `published` | `published` |
| `creator_brand` | `idea` → `hooked` → `created` → `posted` | `posted` |

## Appendix B — Metrics

| key | kind | format | of | meaning |
|---|---|---|---|---|
| `missions` | derived | number |  | Missions done |
| `daysCompleted` | derived | number |  | Days completed |
| `lessons` | derived | number |  | Lessons watched |
| `streak` | derived | number |  | Day streak |
| `prospects` | derived | number |  | Prospects |
| `contacted` | derived | number |  | Prospects contacted |
| `replies` | derived | number |  | Replies |
| `clients` | derived | number |  | Clients won |
| `revenue` | derived | money |  | Revenue earned |
| `videosPublished` | count | number |  | Videos published |
| `uploadsThisWeek` | weekly | number | `videosPublished` | Uploads this week |
| `watchTime` | latest | minutes |  | Watch time |
| `subscribers` | latest | number |  | Subscribers |
| `clickThroughRate` | latest | percent |  | Click-through rate |
| `returningViewers` | latest | percent |  | Returning viewers |
| `channelIncome` | sum | money |  | Channel income |
| `productsLaunched` | count | number |  | Products launched |
| `salesCount` | sum | number |  | Sales |
| `salesThisWeek` | weekly | number | `salesCount` | Sales this week |
| `productRevenue` | sum | money |  | Product revenue |
| `pageVisits` | latest | number |  | Page visits |
| `emailSubscribers` | latest | number |  | Email subscribers |
| `postsPublished` | count | number |  | Posts published |
| `postsThisWeek` | weekly | number | `postsPublished` | Posts this week |
| `linkClicks` | latest | number |  | Link clicks |
| `affiliateIncome` | sum | money |  | Commissions |
| `followers` | latest | number |  | Followers |
| `engagementRate` | latest | percent |  | Engagement rate |
| `brandIncome` | sum | money |  | Brand income |

`count`/`sum`: total of events. `latest`: last event's value. `weekly`: sum of the `of` metric's events in the last 7 days. `derived`: computed from other tables (missions, prospects, deals…), not stored as events.

## Appendix C — Onboarding questions

Order matters: the app asks them in this order, skipping any whose `methods` don't include the resolved journey or whose `showIf` fails. `methods: all` = asked for everyone.

### `name` — text

- Asked for: all

### `earningMethod` — single

- Asked for: all
- Options (`value` → label):
  - `youtube` → YouTube
  - `freelance_services` → Freelance services
  - `digital_products` → Digital products
  - `affiliate_content` → Affiliate content
  - `creator_brand` → Creator brand
  - `unknown` → Not sure yet

### `youtubeMode` — single

- Asked for: all; only when `earningMethod` in ['youtube']
- Options (`value` → label):
  - `own_channel` → I want my own channel
  - `services` → I want to help creators

### `niche` — text

- Asked for: all

### `nicheDetail` — text

- Asked for: all; only when niche answer is too broad (see §1.4)

### `channelStatus` — single

- Asked for: `youtube_owned_channel`
- Summary label: “Channel”
- Options (`value` → label, stage):
  - `none` → Not yet (stage `idea`)
  - `few_videos` → Yes, I've posted a few videos (stage `started`)
  - `growing` → Yes, and it's growing (stage `some_traction`)
  - `earning` → Yes, and it already earns (stage `already_earning`)

### `subscribers` — single

- Asked for: `youtube_owned_channel`; only when `channelStatus` answered and not in ['none']
- Summary label: “Subscribers”
- Options (`value` → label):
  - `under_100` → Under 100
  - `100_1k` → 100 to 1,000
  - `1k_10k` → 1,000 to 10,000 (has plan note)
  - `10k_plus` → 10,000 or more (has plan note)

### `videoFormat` — single

- Asked for: `youtube_owned_channel`
- Summary label: “Format”
- Options (`value` → label):
  - `long` → Longer videos (has plan note)
  - `shorts` → Shorts (has plan note)
  - `both` → A bit of both (has plan note)

### `onCamera` — single

- Asked for: `youtube_owned_channel`, `creator_brand`
- Summary label: “On camera”
- Options (`value` → label):
  - `face` → Happy to be on camera
  - `voice` → Voice only, please (has plan note)
  - `faceless` → I'd rather stay hidden (has plan note)

### `serviceType` — single

- Asked for: `youtube_services`
- Summary label: “Offer”
- Options (`value` → label):
  - `clips` → Cutting short clips from long videos
  - `editing` → Editing full videos (has plan note)
  - `thumbnails` → Designing thumbnails (has plan note)
  - `scripts` → Writing scripts and research (has plan note)
  - `management` → Running their channel (has plan note)

### `clientLocation` — single

- Asked for: `freelance_services`
- Summary label: “Clients”
- Options (`value` → label):
  - `local` → Close to home
  - `anywhere` → Anywhere online (has plan note)

### `clientStatus` — single

- Asked for: `youtube_services`, `freelance_services`
- Summary label: “Experience”
- Options (`value` → label, stage):
  - `none` → Not yet (stage `idea`)
  - `samples` → Yes, for free (stage `started`)
  - `few` → Yes, 1 or 2 paid clients (stage `some_traction`)
  - `regular` → Yes, I have regular clients (stage `already_earning`)

### `portfolio` — single

- Asked for: `youtube_services`, `freelance_services`; only when `clientStatus` in ['none', 'samples']
- Summary label: “Samples”
- Options (`value` → label):
  - `yes` → Yes, a whole portfolio
  - `some` → A few examples
  - `no` → Not yet (has plan note)

### `outreachComfort` — single

- Asked for: `youtube_services`, `freelance_services`
- Summary label: “Outreach”
- Options (`value` → label):
  - `fine` → I'm comfortable with it
  - `nervous` → A bit nervous, but I'll try (has plan note)
  - `avoid` → I'd rather avoid it for now (has plan note)

### `productStatus` — single

- Asked for: `digital_products`
- Summary label: “Product”
- Options (`value` → label, stage):
  - `none` → Not yet (stage `idea`)
  - `made` → I made one, but haven't sold it (stage `started`)
  - `some` → I've made a few sales (stage `some_traction`)
  - `regular` → I sell regularly (stage `already_earning`)

### `productType` — single

- Asked for: `digital_products`
- Summary label: “Format”
- Options (`value` → label):
  - `template` → A template (has plan note)
  - `guide` → A guide or ebook (has plan note)
  - `printable` → Printables (has plan note)
  - `course` → A mini-course (has plan note)
  - `unsure` → Not sure yet

### `audienceStatus` — single

- Asked for: `digital_products`
- Summary label: “Audience”
- Options (`value` → label):
  - `none` → Not really (has plan note)
  - `social` → A small social following (has plan note)
  - `email` → An email list (has plan note)

### `affiliateStatus` — single

- Asked for: `affiliate_content`
- Summary label: “Experience”
- Options (`value` → label, stage):
  - `none` → Not yet (stage `idea`)
  - `posting` → I post, but no links yet (stage `started`)
  - `some` → I've earned a little (stage `some_traction`)
  - `regular` → I earn commissions regularly (stage `already_earning`)

### `affiliatePlatform` — single

- Asked for: `affiliate_content`
- Summary label: “Platform”
- Options (`value` → label):
  - `blog` → A blog (has plan note)
  - `pinterest` → Pinterest (has plan note)
  - `shortvideo` → Short videos (has plan note)
  - `youtube` → YouTube reviews (has plan note)
  - `newsletter` → A newsletter (has plan note)

### `creatorStatus` — single

- Asked for: `creator_brand`
- Summary label: “Account”
- Options (`value` → label, stage):
  - `none` → I haven't started (stage `idea`)
  - `occasional` → I post now and then (stage `started`)
  - `growing` → I'm growing (stage `some_traction`)
  - `earning` → I've had brand deals (stage `already_earning`)

### `creatorPlatform` — single

- Asked for: `creator_brand`
- Summary label: “Platform”
- Options (`value` → label):
  - `instagram` → Instagram
  - `tiktok` → TikTok
  - `linkedin` → LinkedIn (has plan note)
  - `x` → X (has plan note)
  - `shorts` → YouTube Shorts

### `contentStyle` — single

- Asked for: `creator_brand`
- Summary label: “Style”
- Options (`value` → label):
  - `teach` → Teaching (has plan note)
  - `entertain` → Entertaining (has plan note)
  - `story` → Personal stories (has plan note)
  - `bts` → Behind the scenes (has plan note)

### `weeklyTime` — single

- Asked for: all
- Options (`value` → label):
  - `Under 3 hours` → Under 3 hours
  - `3-5 hours` → 3 to 5 hours
  - `5-10 hours` → 5 to 10 hours
  - `10+ hours` → More than 10 hours

### `budget` — single

- Asked for: all
- Options (`value` → label):
  - `$0` → Nothing for now
  - `Under $50` → Less than $50
  - `$50-$200` → $50 to $200
  - `$200+` → More than $200

### `skills` — multi

- Asked for: all
- Options (`value` → label):
  - `Video editing` → Video editing
  - `Writing` → Writing
  - `Speaking on camera` → Speaking on camera
  - `Graphic design` → Graphic design
  - `Social media` → Social media
  - `Sales` → Sales
  - `Research` → Research
  - `Customer service` → Customer service
  - `None yet` → Nothing yet, I'm new
- Options for `youtube_owned_channel`: `Speaking on camera`, `Video editing`, `Writing`, `Graphic design`, `Research`, `Social media`, `None yet`
- Options for `youtube_services`: `Video editing`, `Graphic design`, `Writing`, `Research`, `Social media`, `Sales`, `None yet`
- Options for `freelance_services`: `Sales`, `Customer service`, `Marketing`, `Writing`, `Photography`, `Web design`, `Research`, `None yet`
- Options for `digital_products`: `Writing`, `Graphic design`, `Teaching`, `Organizing`, `Social media`, `Video editing`, `Research`, `None yet`
- Options for `affiliate_content`: `Writing`, `Research`, `Photography`, `Video editing`, `Social media`, `Marketing`, `None yet`
- Options for `creator_brand`: `Speaking on camera`, `Video editing`, `Photography`, `Writing`, `Graphic design`, `Social media`, `None yet`

### `equipment` — multi

- Asked for: `youtube_owned_channel`, `digital_products`, `creator_brand`
- Options (`value` → label):
  - `Smartphone` → Smartphone
  - `Computer` → Computer
  - `Microphone` → Microphone
  - `Camera` → Camera
  - `Lighting` → Lighting
  - `None of these` → None of these yet

### `location` — text (optional)

- Asked for: `freelance_services`; only when `clientLocation` in ['local']

### `goal` — goal

- Asked for: all
- Options: the journey's `goalOptions` (Appendix A)

