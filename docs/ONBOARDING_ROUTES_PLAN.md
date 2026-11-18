# Onboarding: making every route adapt

Based on an audit of `journeys.json`, `OnboardingFlow.swift`, `OnboardingIllustrations.swift`, `ProgramGenerator.swift` and `ServerOnboardingFlow.swift`.
**Today the questions adapt, but most answers only change the "Your setup" card.** The 30-day missions, value screens, goals and voice mostly don't change. The plan has shared fixes (part A), a plan for each route (part B), and an order of work (part C).

## Routes
| Route | How you get there | Track |
|---|---|---|
| 1. Own YouTube channel | YouTube → "My own channel" | youtube_owned |
| 2. Services for creators (clips) | YouTube → "Help creators" | clipping |
| 3. Freelance services | Direct (local or anywhere) | gbp |
| 4. Digital products | Direct | digital_products |
| 5. Affiliate content | Direct | affiliate_content |
| 6. Creator / personal brand | Direct | creator_brand |
| "Not sure yet" | Picker, then one of the above | – |
| Under 18 | Age question | Block screen (done) |

---

## A. Shared fixes (every route)

**Bugs**
1. "How did you hear about us" and age are erased the moment an earning method is picked (`resetMethodAnswers` clears `extra`). Store them outside the per-method answers, and send `heardFrom` to analytics and the backend.
2. Switching method keeps the old niche ("fitness YouTubers" carries into Freelance). Clear `niche` and `nicheDetail` when the method changes.
3. **Answers never reach the plan.** The on-device program uses only niche, stage and time, and the AI request gets none of the route answers. Send the route answers (format, platform, service type, product type, comfort, portfolio, budget, skills, equipment, location) to `/ai/program`. Make the on-device plan pick mission variants from them (part B).
4. "Not sure yet" skips the "one mission a day" screen, and Back shows it out of order. Insert it after the method is chosen.
5. Back on the first question signs the user out or ends the guest session. Make it return to the welcome screen instead.
6. The weekly-time slider pre-selects "3–5 hours", so the user can continue without choosing. Require a real choice, or label it clearly as the default.

**Order and wording**
7. Move the **"one mission a day" value screen after the niche questions**, so its sample mission can really be "written for your niche". Fill in `{niche}` on the sample card and drop the hardcoded "dentist near me".
8. **Niche suggestion chips per route.** Today everyone sees the same 12 (Fitness, Gaming, Beauty…), and the client-type niches are cut off. Add `nicheSuggestions` per journey in `journeys.json`.
9. "Who exactly is it for" (nicheDetail): add route wording. Use viewers for channel, creator and affiliate routes; clients for the services routes; buyers for digital products.
10. **Goals:** add units and a timeframe ("$100 from clients in 30 days"). Hide goals below the user's current stage (someone already earning doesn't see "Earn my first $100").
11. Show the catalog's `mascotLine` in Vault's speech bubble (it's written but never displayed), and pick the mascot mood from the step, not its position.
12. **Voice:** record route versions for `nicheDetail`, `valueMissions`, `valueCoach` and `goal`. Run `scripts/voice-lines.sh` after the copy is final.
13. Analysis screen: show the cleaned niche ("Fitness YouTubers for beginners"), not the raw text. Only list analysis steps that really happen.
14. Results screen: "First goal: $50" becomes "First goal: $50 from clients in 30 days".
15. Signed-in services users get a second backend questionnaire that re-asks what they just answered. Send the local answers along and skip anything already answered (backend spec: journeys-onboarding-backend.md).
16. Remove the dead "coming soon" screen, or keep it behind a real `status: coming_soon`.

---

## B. Plan for each route

### 1. Own YouTube channel
- **Questions:** channel status → subscribers (only if a channel exists) → video format → on camera or not → equipment → time → goal. No change to the order.
- **Value screens:** Day 1 card "Pick your channel's promise for {niche} viewers". Coach chips such as "Give me 5 video ideas for {niche}" and "Fix my thumbnail".
- **Plan adapts to:**
  - **Format:** Shorts-first gets daily Short missions and a weekly long video; long-form gets scripting and retention missions.
  - **Faceless:** voiceover, screen-recording and stock-footage missions; no "film yourself" tasks.
  - **Equipment:** "phone only" gets a phone setup lesson on Day 2.
  - **Stage:** someone with 1k+ subscribers skips "create channel" and starts at packaging and analytics.
- **Goals:** subscribers or videos published (not dollars) for stage 0, and first affiliate or sponsor income for stage 2+.
- **Voice:** niche ("What will your channel be about?"), goal.

### 2. Services for creators (clips, thumbnails, editing)
- **Questions:** service type → helped a creator before → portfolio (only if none) → outreach comfort → time → goal.
- **Value screens:** Day 1 card "Find 10 {niche} creators who post long videos". Coach chips such as "Write my first DM to a podcaster" and "What should I charge per clip?"
- **Plan adapts to:**
  - **Service type:** clips, thumbnails, editing and channel management each get their own Week 1 and 2 missions and samples. Today everything gets a clip plan.
  - **No portfolio:** 3 free sample clips in Week 1 before any outreach.
  - **Low outreach comfort:** start with comments and warm DMs, then cold email.
  - **Stage:** someone who has already helped a creator skips samples and goes straight to pricing and packages.
- **Niche:** chips like Podcasters, Fitness coaches, Gaming streamers, Business YouTubers. The niche must reach the mission text (today 0 of 30 days use it).
- **Goals:** "$X from creator clients in 30 days" and "first paying creator".

### 3. Freelance services (local or anywhere)
- **Questions:** local or anywhere → city (local only, required) → helped a business before → portfolio → outreach comfort → time → goal.
- **Value screens:** Day 1 card "Search '{niche} near {city}' and list 10 without a website" for local, and "Find 10 {niche} on LinkedIn" for anywhere. Remove the fixed "dentist" example.
- **Plan adapts to:**
  - **Local:** walk-in, Google Business Profile and phone scripts.
  - **Anywhere:** marketplace profiles (Upwork, Fiverr) and cold email.
  - **No portfolio:** one free or discounted first project.
  - **Stage:** someone with clients gets referral and retainer missions.
- **Niche:** chips like Restaurants, Dentists, Salons, Real estate agents, Gyms.
- **Goals:** "first paying client" and "$X from clients this month".

### 4. Digital products
- **Questions:** product status → product type → audience status → equipment (only for video courses) → time → goal.
- **Value screens:** Day 1 card "Ask 5 {niche} people what they'd pay to solve". Coach chips such as "Outline my {productType}" and "Price my first product".
- **Plan adapts to:**
  - **Product type:** template, ebook, course or preset each get their own build missions (Week 2).
  - **No audience:** content plus a waitlist before launch. Someone with an audience pre-sells in Week 1.
  - **Stage:** someone with a product already skips building and goes to the sales page and launch.
- **Equipment:** ask only for video courses. Change the options to Canva, Notion, Gumroad and similar instead of camera and lighting.
- **Goals:** "first sale", "10 sales", "$X in sales".

### 5. Affiliate content
- **Questions:** affiliate status → platform → **equipment if the platform is video** (missing today) → time → goal.
- **Value screens:** Day 1 card "Pick 3 {niche} products you'd actually recommend". Coach chips such as "Write a review script for…" and "Which programs pay best in {niche}?"
- **Plan adapts to:**
  - **Platform:** a blog or Pinterest gets SEO and pin missions; YouTube reviews get comparison videos; short videos get daily hooks.
  - **Stage:** someone already earning works on conversion and email.
- **Disclosure:** add an affiliate-disclosure mission on Day 1 for every platform.
- **Goals:** "first commission" and "$X in commissions".

### 6. Creator / personal brand
- **Questions:** on camera → creator status → platform → content style → equipment → time → goal.
- **Value screens:** Day 1 card "Write your bio for {platform}: who you help in {niche}". Coach chips such as "Plan my week of {platform} posts" and "Pitch my first brand deal".
- **Plan adapts to:**
  - **Platform:** Instagram, TikTok and YouTube Shorts get platform-specific missions and plan notes (missing today).
  - **Content style:** educational, entertaining or lifestyle changes the post formats.
  - **Faceless:** faceless formats.
  - **Stage:** someone who is growing gets a media kit and brand outreach.
- **Goals:** followers or posts for stage 0, then first brand deal or first product sale.

### "Not sure yet"
- Keep the picker, then add the "one mission a day" screen after the choice. Allow coming back to the picker with Back.
- Optional: one extra question ("Do you prefer making content, helping clients, or selling something?") to pre-select a route.

---

## C. Order of work
1. **Bugs and data (part A, items 1–6):** answers stop disappearing and reach the AI plan. Small and high value.
2. **Copy and catalog (items 7–14):**
   - niche chips, goals with units, route wording, `mascotLine`, and the value screen after the niche (edits in `journeys.json` and `OnboardingFlow`);
   - then record the new voice lines.
3. **On-device plan variants (part B):** the main change. Add mission variants by service type, product type, platform, format and faceless to the track plans, and select them from the answers. Until this ships, the AI plan (from step 1) is the adapted version for users with a connection.
4. **Backend questionnaire (item 15):** send the local answers and skip duplicates. Needs the backend team.
5. **Test each route** on the simulator end to end, with a checklist: every screen shows that route's wording, Day 1 matches, and the plan differs.
