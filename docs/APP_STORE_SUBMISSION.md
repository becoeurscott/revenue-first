# Vaulten: App Store submission pack

Everything to paste into App Store Connect for version 1.0. Fields marked **[decide]** need your call; fields marked **[backend]** need the backend team.

---

## 1. App information (App Store Connect → App Information)

| Field | Value |
|---|---|
| Name (30 max) | `Vaulten: First Income Coach` |
| Subtitle (30 max) | `Daily missions to earn online` |
| Bundle ID | `com.vaulten.app` |
| Primary category | Education |
| Secondary category | Business |
| Content rights | Does not contain, show or access third-party content: **No** (it shows YouTube videos through the official embed) |

The subtitle and name avoid income promises on purpose (App Review rule 2.3.1 / 3.1: no guaranteed earnings).

---

## 2. Version 1.0 text (App Store Connect → iOS App → 1.0)

### Promotional text (170 max, editable anytime)
```
Pick how you want to earn, get a 30-day plan written for your niche, and do one clear mission a day with a coach that knows where you are.
```

### Description (4000 max)
```
Vaulten turns "I want to make money online" into one clear step a day.

Tell Vault, your coach, how you'd like to earn: grow a YouTube channel, help creators, offer freelance services, sell a digital product, write affiliate content or build a creator brand. Answer a few questions about your niche, your time and your starting point, and Vaulten builds a 30-day program around you.

ONE MISSION A DAY
Each day comes with a single mission that takes 15 to 45 minutes: a short lesson, a few concrete tasks and a checklist. No theory overload, just the next step toward your first income.

WRITTEN FOR YOUR NICHE
Your plan, examples and suggested outreach use your niche and your audience, not generic advice.

A COACH WHEN YOU'RE STUCK
Ask anything: what to sell, how to price it, what to write in your first message to a client. The coach knows your journey and your progress.

LEARN FROM REAL VIDEOS
Each mission links hand-picked lesson videos so you can see how others did it.

TRACK WHAT MATTERS
Log prospects, deals and revenue, keep your streak, earn XP and see your progress week by week. Monthly check-ins shape your next 30 days.

SPOT FAKE MENTORS
A two-minute check helps you tell real advice from "get rich quick" courses before you pay for anything.

SUBSCRIPTIONS
Vaulten is free to explore. Premium and Ultimate unlock the full 30-day program, the AI coach, every lesson and tool, and a new plan every month. Payment is charged to your Apple ID at confirmation. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel anytime in your App Store account settings.

Vaulten is a learning and planning tool. Results depend on your effort and circumstances; we don't promise any income.

Terms of Use: https://vaulten.space/legal/terms
Privacy Policy: https://vaulten.space/legal/privacy
```

### Keywords (100 max, comma-separated, no spaces)
```
side hustle,freelance,make money,online business,coach,digital product,youtube,creator,income,habits
```

### URLs
| Field | Value |
|---|---|
| Support URL | `https://vaulten.space/support` **[decide]** (must be a live page; a simple page with the support email works) |
| Marketing URL | `https://vaulten.space` (optional) |
| Privacy Policy URL | `https://vaulten.space/legal/privacy` |
| Terms (EULA) | Use Apple's standard EULA, or paste `https://vaulten.space/legal/terms` in the description (done above) |

### Copyright
```
2026 Vaulten
```

### What's new (first version: leave empty)

---

## 3. App Review information

| Field | Value |
|---|---|
| Sign-in required | Yes |
| Demo account | **[backend]** a production account with an active complimentary Ultimate grant. Create it once the production API is ready; never reuse a staging account |
| Contact | your name, phone and email **[decide]** |

### Notes for the reviewer (paste)
```
Vaulten is a coaching app that helps people start earning online with a daily mission plan.

How to review:
1. Sign in with the demo account above (it has an active subscription), or create an account with any email (a 6-digit code is emailed).
2. Home shows today's mission. Tap "Start Mission" to open it.
3. The Coach tab answers questions about the user's plan (AI-generated; answers are guidance, not financial advice).
4. Settings > Security has optional Face ID unlock.

Subscriptions (Premium, Ultimate) are sold with StoreKit through RevenueCat. "Restore" is on the paywall. Accounts can be deleted in Profile > Settings > Security > Delete account.

The app does not promise income. Users under 18 are blocked at onboarding.
```

---

## 4. App Privacy (App Store Connect → App Privacy)

Tracking: **No** (no ad networks, no IDFA, no App Tracking Transparency prompt).

Answer "Yes, we collect data", then declare:

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|---|---|---|---|---|
| Contact Info → Name | Yes | Yes | No | App Functionality |
| Contact Info → Email Address | Yes | Yes | No | App Functionality, Customer Support |
| User Content → Customer Support | Yes | Yes | No | Customer Support |
| User Content → Other User Content (coach messages, goals, prospects, notes) | Yes | Yes | No | App Functionality |
| Identifiers → User ID | Yes | Yes | No | App Functionality, Analytics |
| Purchases → Purchase History | Yes | Yes | No | App Functionality |
| Usage Data → Product Interaction | Yes | Yes | No | Analytics |
| Diagnostics → Crash Data | Yes | Yes | No | App Functionality |
| Diagnostics → Performance Data | Yes | Yes | No | App Functionality |
| Other → Device push token | Yes | Yes | No | App Functionality |

Sources: account API (name, email), Support inbox, Coach/program API, RevenueCat (purchases, app user ID = account ID), PostHog (product events identified by account ID, no email), Sentry (crashes linked to account ID, `sendDefaultPii = false`), APNs.

Not collected: location, contacts, photos, health, browsing history, financial account numbers, advertising data. Face ID data never leaves the device (Apple handles it).

---

## 5. Age rating (App Store Connect → Age Rating)

| Question | Answer |
|---|---|
| Violence, sexual content, profanity, horror, drugs, alcohol, gambling, contests | None |
| Medical or treatment information | None |
| Unrestricted web access | No (only embedded YouTube players) |
| User-generated content shared with other users | No |
| Messaging/chat with other users | No |
| AI chatbot / generated content | Yes (the coach and the program) |
| Age assurance / parental controls | The app blocks users under 18 at onboarding |

Resulting rating: **18+** **[decide]**, to match the app's own age gate. If you prefer 13+ or 16+, remove the under-18 block first, or Review may flag the mismatch.

---

## 6. Subscriptions (App Store Connect → Subscriptions)

For each product (`com.vaulten.app.premium.*`, `com.vaulten.app.ultimate.*`, the offer products):
- Status must be **Ready to Submit**: display name, description, price, and a review screenshot of the paywall (use `screenshots/appstore/05-paywall.png`).
- Attach them to version 1.0 under "In-App Purchases and Subscriptions" before submitting.
- Subscription group display name: `Vaulten`.

---

## 7. Screenshots

iPhone 6.9" (1260 x 2736, iPhone Air) in `screenshots/appstore/`, in this order:
1. Welcome (`01-welcome.png`)
2. Pick how you want to earn
3. Your plan is ready
4. Today's mission
5. Paywall (also used for subscription review)
6. Coach

iPad: the target currently supports iPhone **and iPad** (`TARGETED_DEVICE_FAMILY = 1,2`), so App Store Connect will also require 13" iPad screenshots. **[decide]** either provide iPad screenshots, or switch the target to iPhone only before the next build.

---

## 8. Still blocking (not in App Store Connect)

1. **[backend]** Production API URL in `VaultenConfig.baseURL`; rebuild and bump the build number.
2. **[backend]** Coach rejects subscribers with `COACH_TIER_REQUIRED`: link the Premium and Ultimate tiers to the RevenueCat entitlements `vaulten_pro` and `vaulten_ultimate`.
3. **[backend]** Production demo account with complimentary access (section 3).
4. Support URL page live (section 2).
