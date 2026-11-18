# Backend configuration: every key Vaulten needs

There are two kinds of configuration:

1. **Environment variables (secrets).** These are set on the server where the Vaulten backend is hosted.
   - They are never returned by any API and are never sent to the app.
   - Changing one means a redeploy or restart.
2. **Admin settings.** These are declared in the backend code, then changed live from the admin dashboard → Settings (`GET /admin/settings`, `PATCH /admin/settings/{key}`).
   - Only keys declared in code can be changed; an unknown key returns 404.
   - Settings marked **app** must also be returned to the app by a public endpoint (see the end of this document).

The settings that already exist (`lessons.*`, `missions.*`, `progress.*`, `revenue.milestones`, `xp.*`, `trial.days`, `coach.dailyMessageLimit`, `coach.model`, `app.*`, `security.lockoutAttempts`) are kept. Everything below is new.

---

## 1. Environment variables (secrets)

### AI coach and program (spec: ai-backend.md)
| Variable | Example / where to get it | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | openrouter.ai → Keys | Required for `/ai/coach` and `/ai/program` |
| `OPENROUTER_MODEL_SMART` | `anthropic/claude-opus-5.5` | Optional override |
| `OPENROUTER_MODEL_FAST` | `anthropic/claude-sonnet-5.5` | Optional override |

### Subscriptions (RevenueCat)
| Variable | Where to get it | Notes |
|---|---|---|
| `REVENUECAT_SECRET_KEY` | RevenueCat → Project → API keys → secret key (v1) | Checks each caller's plan (Premium, Ultimate, trial) |
| `REVENUECAT_WEBHOOK_AUTH` | Any long random string, also entered in RevenueCat → Integrations → Webhooks | Verifies webhook calls (renewals, cancellations, refunds) |

### Usage counters and caches
| Variable | Where to get it | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash → database → REST API | Coach message counts, video cache, rate limits. Any Redis the backend already uses works too |
| `UPSTASH_REDIS_REST_TOKEN` | same | |

### Lesson videos (spec: ai-backend.md → GET /ai/videos)
| Variable | Where to get it | Notes |
|---|---|---|
| `YOUTUBE_API_KEY` | Google Cloud Console → enable YouTube Data API v3 → Credentials → API key | Restrict the key to the YouTube Data API v3 |

### Sign in with Apple and Google (spec: social-sign-in.md)
| Variable | Where to get it | Notes |
|---|---|---|
| `APPLE_BUNDLE_ID` | `com.vaulten.app` | Expected `aud` of Apple identity tokens |
| `APPLE_TEAM_ID` | Apple Developer → Membership (`LGHS3SPMJ7`) | |
| `APPLE_SIGNIN_KEY_ID` | Apple Developer → Keys → a key with "Sign in with Apple" enabled | Exchanges codes and revokes on account deletion |
| `APPLE_SIGNIN_PRIVATE_KEY` | Contents of that key's `.p8` file | Secret |
| `GOOGLE_IOS_CLIENT_ID` | Google Cloud → OAuth client of type iOS, bundle `com.vaulten.app` | Expected `aud` of Google ID tokens |

### Email (support replies, verification codes, new-message alerts)
| Variable | Example | Notes |
|---|---|---|
| `EMAIL_PROVIDER_API_KEY` | Resend, Postmark or SES key | Whichever provider the backend already uses for verification codes |
| `EMAIL_FROM` | `Vaulten <hello@vaulten.app>` | |
| `SUPPORT_INBOX_EMAIL` | `support@vaulten.app` | Gets a copy of every new support message (admin-extensions.md §7) |

### Push notifications (daily mission reminders)
| Variable | Where to get it | Notes |
|---|---|---|
| `APNS_KEY_ID` | Apple Developer → Keys → a key with APNs enabled | |
| `APNS_TEAM_ID` | `LGHS3SPMJ7` | |
| `APNS_PRIVATE_KEY` | Contents of the APNs `.p8` file | Secret |
| `APNS_TOPIC` | `com.vaulten.app` | |
| `APNS_ENV` | `sandbox` for TestFlight and Xcode, `production` for the App Store | |

### Monitoring and analytics
| Variable | Where to get it | Notes |
|---|---|---|
| `POSTHOG_API_KEY` | PostHog → Project settings → project API key (`phc_…`) | Server-side events (AI usage, purchases) |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | |
| `SENTRY_DSN` | Sentry → project → Client keys | Backend error reports |

Not backend variables: `DASHSCOPE_API_KEY` (mascot videos) and `ELEVENLABS_API_KEY` (voice and sound effects) are used only by local scripts when generating assets. They never go on the server.

---

## 2. Admin settings (new keys to declare)

Type, default and description, as returned by `GET /admin/settings`. **app** = the app reads it, so include it in the public config endpoint in §3.

### AI coach plans
| Key | Type | Default | Description |
|---|---|---|---|
| `coach.enabled` | boolean | `true` | Global kill switch for the AI Coach (the app shows built-in answers). **app** |
| `coach.monthlyLimitPremium` | number | `10` | Coach messages per month on Premium |
| `coach.monthlyLimitUltimate` | number | `300` | Coach messages per month on Ultimate |
| `coach.monthlyLimitTrial` | number | `20` | Coach messages during any free trial |
| `program.enabled` | boolean | `true` | Kill switch for the AI-written 30-day program (falls back to the built-in plan). **app** |

### Lesson videos
| Key | Type | Default | Description |
|---|---|---|---|
| `videos.enabled` | boolean | `true` | Show the "Watch & learn" section. **app** |
| `videos.maxResults` | number | `6` | Videos per mission (1–10) |
| `videos.dailySearchesPerUser` | number | `40` | New YouTube searches per account per day |
| `videos.cacheDays` | number | `7` | Reuse a query's results for this many days |
| `videos.minDurationSeconds` | number | `120` | Leave out shorter videos (no Shorts) |
| `videos.maxDurationSeconds` | number | `2700` | Leave out longer videos |
| `videos.blockedChannelIds` | object[] | `[]` | `{ id, reason }` channels never shown |

### Paywall and gift offers
| Key | Type | Default | Description |
|---|---|---|---|
| `offers.enabled` | boolean | `true` | Show the gift popups after the paywall is closed. **app** |
| `offers.giftDelaySeconds` | number | `1` | Wait before the gift appears after closing the paywall. **app** |
| `offers.lastChanceDelaySeconds` | number | `180` | Time in the app before the "last chance" gift returns. **app** |
| `offers.lastChanceHours` | number | `24` | How long the 50% offer stays valid once shown (the real countdown). **app** |

### Sign-in
| Key | Type | Default | Description |
|---|---|---|---|
| `auth.appleEnabled` | boolean | `false` | Show "Continue with Apple" (turn on once `/auth/apple` is live). **app** |
| `auth.googleEnabled` | boolean | `false` | Show "Continue with Google" (only together with Apple, App Store rule 4.8). **app** |

### Support and legal
| Key | Type | Default | Description |
|---|---|---|---|
| `support.email` | string | `support@vaulten.app` | Address shown in the app and used for the email fallback. **app** |
| `support.replyPromise` | string | `Within 24 hours` | Reply time shown after a message is sent. **app** |
| `support.messagesPerHour` | number | `5` | Rate limit on `POST /support/messages` per device |
| `legal.termsUrl` | string | `https://vaulten.app/legal/terms` | Linked on the paywall and at sign-up. **app** |
| `legal.privacyUrl` | string | `https://vaulten.app/legal/privacy` | Linked on the paywall and at sign-up. **app** |

---

## 3. Public config endpoint for the app

`GET /app/config` (no auth, cacheable for 5 minutes) returns only the settings marked **app**, as a flat object:

```json
{ "data": {
  "coach.enabled": true, "program.enabled": true, "videos.enabled": true,
  "offers.enabled": true, "offers.giftDelaySeconds": 1, "offers.lastChanceDelaySeconds": 180, "offers.lastChanceHours": 24,
  "auth.appleEnabled": false, "auth.googleEnabled": false,
  "support.email": "support@vaulten.app", "support.replyPromise": "Within 24 hours",
  "legal.termsUrl": "https://vaulten.app/legal/terms", "legal.privacyUrl": "https://vaulten.app/legal/privacy",
  "app.minVersion": "1.0", "app.latestVersion": "1.0", "app.forceUpdate": false
} }
```

Never include secrets or internal limits here. The app keeps its built-in defaults whenever this endpoint is missing or fails.
