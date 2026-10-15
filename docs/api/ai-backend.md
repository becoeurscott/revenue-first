# Vaulten API: AI endpoints (coach and personal program)

The iOS app's AI features must run on the Vaulten backend: the AI Coach and the personal 30-day program. The backend holds the OpenRouter key, checks the user's plan with RevenueCat, and counts coach messages.

The app already calls these endpoints:

- **When an endpoint is missing** (404) or **not configured** (503), the app falls back to its built-in coach answers and an on-device plan. So the endpoints can ship one at a time without breaking anything.
- **A working TypeScript implementation** of everything below exists in this repo as Vercel functions. Port it rather than redesigning:

| File | What it contains |
|---|---|
| `api/_lib/llm.ts` | The OpenRouter call: caching, structured output, model fallback, error mapping |
| `api/_lib/access.ts` | The plan check (RevenueCat) and the coach message counter |
| `api/_lib/shared.ts` | The methodology prompt for each journey, request-context parsing, PostHog LLM analytics |
| `api/coach.ts` | The coach endpoint |
| `api/program.ts` | The personal program endpoint |

Conventions are the same as the rest of the API: bearer auth, JSON bodies. Error bodies here are `{ "error": "<code>" }`, which the app already handles. Change them to the `{ data, meta }` / problem+json format only together with the app.

---

## 1. Settings

| Setting | Value |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key; the account needs credits |
| `OPENROUTER_MODEL_SMART` | default `anthropic/claude-opus-5.5` (program, playbook) |
| `OPENROUTER_MODEL_FAST` | default `anthropic/claude-sonnet-5.5` (coach, niche profile) |
| `REVENUECAT_SECRET_KEY` | RevenueCat secret API key (`sk_…`, v1 API) |
| Usage store | Redis or a DB table for coach message counters (§4) |

---

## 2. Plans (from RevenueCat)

Look up the subscriber by the **Vaulten user id**, which the app uses as the RevenueCat app user id:

```
GET https://api.revenuecat.com/v1/subscribers/{userId}
Authorization: Bearer {REVENUECAT_SECRET_KEY}
```

Work out the plan from the active entitlements, meaning `expires_date` is null or in the future:

| Condition | Plan |
|---|---|
| `vaulten_ultimate` active, its product's `subscriptions[product].period_type == "trial"` | `trial` |
| `vaulten_ultimate` active | `ultimate` |
| `vaulten_pro` active, in trial | `trial` |
| `vaulten_pro` active | `premium` |
| otherwise, or the lookup fails | `free` |

A failed lookup always means `free`, never a paid plan. Cache the result for about 60 seconds per user. Even better, keep it up to date with RevenueCat webhooks.

---

## 3. `POST /ai/coach`: one coach answer

**Auth:** bearer (the user's access token).

**Request:**
```json
{
  "context": {
    "journeyId": "affiliate_content",
    "journeyVersion": 1,
    "niche": "Beauty",
    "nicheProfile": { "normalizedLabel": "...", "audience": "...", "problemOrDesire": "...",
                      "allowedClaims": [], "restrictedTopics": [], "exampleTerms": [], "monetizationOptions": [] },
    "startingStage": "idea",
    "constraints": { "weeklyTime": "3-5h", "budget": "0", "equipment": [], "skills": [], "location": "" },
    "name": "Scott", "goal": "Publish 10 helpful posts",
    "currentDay": 4, "currentMission": "...",
    "metrics": { "postsPublished": 2 },
    "month": 1, "focus": ""
  },
  "messages": [ { "from": "user", "text": "How do I..." }, { "from": "coach", "text": "..." }, { "from": "user", "text": "..." } ],
  "ai": { "distinctId": "enrollment:abc", "sessionId": "c-123", "traceId": "uuid" }
}
```

- `messages` holds the last 12 turns; the last one is always the user's.
- Clip each text to 2,000 characters.
- Drop leading coach turns, so the conversation starts on a user turn.

**Responses:**

| Status | Body | When |
|---|---|---|
| 200 | `{ "reply": "text", "usage": CoachUsage }` | Answered |
| 402 | `{ "error": "coach_limit_reached", "usage": CoachUsage }` | Allowance spent. The app shows the upgrade card. |
| 400 | `{ "error": "unsupported_journey" }` / `{ "error": "bad_request" }` | Unknown journey or missing fields. **Never coach a different journey instead.** |
| 401 | `{ "error": "unauthorized" }` | Bad token |
| 429 | `{ "error": "busy" }` | Model rate-limited |
| 503 | `{ "error": "ai_not_configured" }` / `{ "error": "usage_unavailable" }` | No key, or the usage store is down. The app uses built-in answers. |
| 502 | `{ "error": "upstream" }` / `{ "error": "empty" }` | Model error |

**`CoachUsage`:**
```json
{ "tier": "free|premium|ultimate|trial", "used": 3, "limit": 10, "period": "lifetime|month", "resetsAt": "2026-11-01T00:00:00.000Z" }
```
`resetsAt` is null for `lifetime`.

**Order of operations:**
1. Check the token, look up the plan (§2), and validate the body.
2. **Reserve** one message (§4). If the allowance is spent, return 402.
3. Call the model (§6) with the **fast** model and `max_tokens` 1,500, **without web search**.
4. If the call fails for any reason, **give the message back**, so users only pay for answers they received.

## 4. Coach allowance

| Plan | Limit | Period |
|---|---|---|
| free | **0** (the app has no free plan) | lifetime |
| trial | 20 | per calendar month (UTC) |
| premium | 10 | per calendar month |
| ultimate | 300 | per calendar month |

- **Counter key:** `coach:{userId}:{YYYY-MM}`, or `coach:{userId}:lifetime` for free.
- **Reserve:** increment the counter. If the new value is above the limit, decrement it and return 402.
- **Expiry:** expire monthly keys a few days after the month ends.
- **Usage store down:** **refuse** (503). Never serve the AI without counting.

## 5. `GET /ai/coach`: current allowance

Bearer auth. Returns `{ "usage": CoachUsage }` without spending a message. The app calls it when the coach opens and after a purchase.

## 6. `POST /ai/program`: the personal plan

**Auth:** bearer.

**Request:**
```json
{
  "scope": "preview" | "full",
  "context": { ...same as §3..., "month": 2, "focus": "Double your outreach and follow up" },
  "plan": [ { "day": 1, "week": 1, "theme": "...", "mission": "...", "goal": "..." }, ... ],
  "program": { "title": "...", "summary": "..." },
  "ai": { ... }
}
```

- `preview` writes the header and Days 1–7. `full` writes Days 8–30 and Weeks 2–4.
- **`full` requires a paid plan** (`premium`, `ultimate` or `trial`). Otherwise return 402 `payment_required`. Never write the paid part for a free account.
- `month` > 1 means the plan is aimed at the `focus` from the user's last monthly review.
- Use the **smart** model, structured output with the schemas in `api/program.ts` (`PreviewSchema`, `FullSchema`), and `max_tokens` 8,000 (preview) or 20,000 (full).

**Response 200:**
```json
{ "scope": "preview", "journeyId": "...", "title": "...", "summary": "...",
  "weeks": [ { "week": 1, "title": "...", "outcome": "..." } ],
  "days":  [ { "day": 1, "title": "...", "objective": "...", "steps": ["...","...","..."], "tip": "...", "deliverable": "..." } ] }
```

- Return exactly one day for each requested day, in order. Otherwise return 502 `bad_output`.
- Cap `steps` at 4.

## 7. Calling the model (OpenRouter)

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer {OPENROUTER_API_KEY}
{
  "models": ["anthropic/claude-sonnet-5.5", "anthropic/claude-haiku-5.5"],   // primary, then fallback
  "max_tokens": 1500,
  "messages": [
    { "role": "system", "content": [
        { "type": "text", "text": "<journey methodology>", "cache_control": { "type": "ephemeral" } },
        { "type": "text", "text": "<style + this user's context>" } ] },
    { "role": "user", "content": "..." }, ...
  ],
  "response_format": { "type": "json_schema", "json_schema": { "name": "program_full", "strict": true, "schema": { ... } } }
}
```

- **Fallbacks:** Opus 5.5 falls back to Sonnet 5.5; Sonnet 5.5 falls back to Haiku 5.5.
- **Caching:** the journey methodology is identical for everyone on a journey, so it goes first and is marked `cache_control`. Repeat calls then pay the cached-input price.
- **Structured output:** the JSON schema comes from the zod schemas. Remove `$schema`, `minimum` and `maximum` before sending, then **validate the result again** before returning it.
- **No web search.** OpenRouter's `web` plugin runs and bills on every request.
- **Error mapping:** HTTP 429 → `busy`; 401 → `ai_not_configured`; `finish_reason` `refusal` or `content_filter` → 422 `refused`; anything else → 502 `upstream`.
- **Analytics:** send one PostHog `$ai_generation` event per call, with the model, input, output and cached tokens, and latency. **Never send the user's text.**

The prompts are in `api/_lib/shared.ts` (`methodology`, `describeContext`) and in the endpoint files (`COACH_STYLE`, the program request text). Reuse them word for word, because they encode the product rules: no income promises, the restricted-topics rules, and never switching a user's journey.

## 8. Rough cost per user

At OpenRouter's list prices plus its ~5.5% fee on credits:

| Item | Approx. cost |
|---|---|
| Coach message (Sonnet 5.5, ~3k in incl. cache, ~400 out) | ~$0.005–0.01 |
| Premium month (10 messages) | ~$0.10 |
| Ultimate month at the 300-message cap | ~$2–3 |
| Personal plan (Opus 5.5, preview + full) | ~$0.15–0.30, once a month |
