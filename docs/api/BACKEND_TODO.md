# Vaulten backend: what is still needed

Checked on 13 Nov 2026 against the live staging Swagger (`/api/docs-json`, 209 routes). A copy of that spec is now in `docs/api/vaulten-openapi.json`.
Details for each feature are in the existing specs: `journeys-onboarding-backend.md`, `ai-backend.md`, `backend-config.md`, `admin-extensions.md`.

The backend already has most of the product: journeys, enrollments, niche resolve and history, programs, metrics, coach conversations, subscription tiers, complimentary grants, `subscriptions/sync`, notifications, support, app config, videos, and `DELETE /users/me`. This list covers only what is **missing or needs confirming**.

---

## 1. Subscriptions (blocks release)

The app now reads access from `GET /subscriptions/me`, loads tiers from `GET /subscriptions/tiers`, and calls `POST /subscriptions/sync` after every purchase and restore. The AI Coach opens only when the user's tier has the feature `coach`.

- [ ] **Create and publish the tiers.** Planned products and entitlements:

  | Tier key  | RevenueCat entitlement | App Store products               | Features (proposal, to confirm with product) |
  |-----------|------------------------|----------------------------------|----------------------------------------------|
  | `basic`   | `vaulten_basic`        | `monthly_basic`, `yearly_basic`     | full 30-day program, lessons, resources       |
  | `pro`     | `vaulten_pro`          | `monthly_pro`, `yearly_pro`         | basic + `coach` (lower monthly cap)           |
  | `premium` | `vaulten_premium`      | `monthly_premium`, `yearly_premium` | pro + `coach` (higher cap) + multiple journeys |

  `revenueCatEntitlementId` must match RevenueCat exactly. `coachMonthlyLimit` is set per tier. The app reads all of this from the API, so changing a tier needs no app update.
- [ ] **RevenueCat webhook.** No webhook route is visible in Swagger (it may be hidden on purpose). Please confirm that:
  - it exists, and its URL is set in RevenueCat → Integrations → Webhooks;
  - it checks the `Authorization` header against a secret stored only on the server, and rejects anything else;
  - it handles `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `REFUND`, and `TRANSFER`, without breaking if the same event arrives twice;
  - each change is written to the audit log.
- [ ] **Paid features are checked on the server.** Coach messages, program generation, and any paid content must check the entitlement and tier on the server, never trust the app. When access is missing, answer `403` with a stable `code` such as `SUBSCRIPTION_REQUIRED`.
- [ ] **RevenueCat user id.** The app logs in to RevenueCat with the Vaulten `user.id`. `subscriptions/sync` and the webhook must use the same id.
- [ ] `DELETE /users/me` should also delete or anonymize the RevenueCat customer (RevenueCat REST `DELETE /v1/subscribers/{id}`) and end that user's grants.

## 2. AI Coach

- [ ] **Coach allowance for the user.** The app shows "X messages left this month", but there is no user-facing usage route (only `GET /admin/coach/usage`). Add `GET /coach/usage` returning `{ used, limit, resetsAt }` for the user's tier. When the cap is reached, `POST /coach/conversations/{id}/messages` should return `429` with `code: "COACH_LIMIT_REACHED"` and the same usage object.
- [ ] **Context comes from the server.** `SendCoachMessageRequestDto` only takes `message`. Please confirm the coach prompt is built on the server from the **active enrollment**: journey, niche profile (including allowed claims and restricted topics), starting stage, weekly time, budget, skills, equipment, goal, current day and mission, and recent metrics. Each journey also needs its own vocabulary:
  - own YouTube channel: topics, scripts, thumbnails, publishing, analytics
  - YouTube services: samples, creators, outreach, offers, follow-ups
  - digital products: product idea, validation, landing page, launch
  - affiliate content: reviews, comparisons, disclosure, traffic
  - freelance services: offer, portfolio, clients, delivery, payment
- [ ] **Safety.**
  - Treat the user's message as data, never as instructions (protection against prompt injection).
  - Refuse or redirect in sensitive niches (health, finance, legal) and add disclaimers there.
  - Never promise income.
  - Time out after about 60 seconds with `code: "COACH_UNAVAILABLE"`.
  - Rate limit per user and per IP.
  - Logs must not keep full message text longer than needed.
- [ ] The app currently calls the old `POST /ai/coach` and `POST /ai/program`. It will move to `/coach/conversations` and `/me/program/generate` as soon as the two items above are confirmed.

## 3. Journeys and progress (the backend must be the source of truth)

On iOS, a user's journeys (enrollments, niche, plan, progress) are still stored on the phone. The app will switch to `/enrollments`, `/enrollments/{id}/niche`, `/enrollments/{id}/program`, `/enrollments/{id}/metrics`, and `/enrollments/{id}/items`. Please confirm or add:

- [ ] **Goals.** There is no goals route. Add `GET/PUT /enrollments/{id}/goal` returning `{ type, target, currency?, deadline? }`, or say where the goal lives (for example a field on the enrollment).
- [ ] **Saved lessons and resources.** There is no route. Add `GET /me/saved`, `PUT /me/saved/{kind}/{id}`, and `DELETE /me/saved/{kind}/{id}`, where `kind` is `lesson`, `resource`, or `video`.
- [ ] **Service-only data.** `/prospects`, `/deals`, and `/revenue/*` have no `enrollmentId` filter. Add `enrollmentId` (stored when created, accepted as a filter). These routes should answer `409 NOT_A_SERVICE_JOURNEY` for journeys that aren't selling services: own YouTube channel, affiliate content, digital products, creator brand.
- [ ] `/missions/current` and `/progress/summary` should be based on the active enrollment, not the old single path.
- [ ] A user who reinstalls the app or signs in on another device should get every enrollment back, including paused ones, from `GET /enrollments`.

## 4. Account and privacy

- [ ] **Self-service data export.** Add `POST /users/me/export` that emails a download link or returns the file. This is needed for GDPR and privacy requests. Only an admin version exists today.
- [ ] Confirm that `DELETE /users/me` erases personal data, revokes every session and push token, and handles RevenueCat (see section 1).
- [ ] Confirm rate limits on `auth/login`, `auth/register`, `auth/password/forgot`, `auth/email/resend`, `coach/*`, `videos`, and `support/messages`.
- [ ] Store every secret only in the server environment: RevenueCat secret and webhook secret, OpenRouter/Anthropic, YouTube, OneSignal, Sentry. None of them may ever go to the app or the admin web app.
- [ ] Change the staging Swagger password before production. It was shared in chat.

## 5. Configuration (`GET /app/config`)

- [ ] Set `videos.enabled: true` on staging so lesson videos show in the app. The app now uses `GET /videos?q=`.
- [ ] Set `legal.termsUrl`, `legal.privacyUrl`, `support.email` to real, working pages. App Store review opens them.
- [ ] Add `legal.subscriptionTermsUrl`, plus `legal.incomeDisclaimer` text (for example, "Results vary. Vaulten does not guarantee income.").

## 6. Small things noticed while testing

- Without an `Authorization` header, protected routes answer `404` instead of `401` (with any header, they answer `401` correctly). This makes debugging confusing. Please return `401` everywhere.
- Bursts of requests sometimes get `404` instead of `429` from staging. A rate limiter should answer `429` with `Retry-After`.
- Error texts default to French. The app sends `Accept-Language`; please confirm English works.
