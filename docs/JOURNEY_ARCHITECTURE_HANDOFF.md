# FirstRevenue Journey Architecture Handoff

## Product decision

The app must adapt to the user's **earning method**, not only their niche.

These are separate concepts:

- **Earning method:** how the user plans to make money.
- **Niche:** the subject, audience, or industry.
- **Starting stage:** what the user already has and knows.
- **Constraints:** time, budget, equipment, location, and preferences.

The same niche can produce different journeys. For example:

- `youtube_owned_channel`: build and monetize the user's own YouTube channel.
- `youtube_services`: sell editing, thumbnails, scripting, or channel management to creators.

The prospect/client workflow belongs to service-selling journeys only.

This architecture must work across many niches: fitness, gaming, beauty, finance, education, food, travel, fashion, real estate, technology, health, parenting, music, sports, and niches that do not exist in the initial catalog. Do not create one separate product flow per niche. Keep the workflow general and generate niche-specific content inside it.

The system should treat a niche as structured context rather than as a fixed enum:

```ts
interface NicheContext {
  rawInput: string
  normalizedLabel: string
  audience: string
  problemOrDesire: string
  allowedClaims: string[]
  restrictedTopics: string[]
  exampleTerms: string[]
  monetizationOptions: string[]
}
```

If the user enters a niche that is not in the catalog, normalize it and continue with the selected earning method. Ask one short follow-up only when the niche is too broad to create useful guidance. Never replace an unfamiliar niche with a generic business plan.

## Required onboarding questions

Add these fields to onboarding:

```ts
type EarningMethod =
  | 'youtube_owned_channel'
  | 'youtube_services'
  | 'freelance_services'
  | 'digital_products'
  | 'affiliate_content'
  | 'creator_brand'
  | 'unknown'

type StartingStage = 'idea' | 'started' | 'some_traction' | 'already_earning'

interface JourneyAnswers {
  earningMethod: EarningMethod
  niche: string
  startingStage: StartingStage
  weeklyTime: string
  budget: string
  skills: string[]
  equipment: string[]
  location?: string
  goal: string
}
```

If the user selects YouTube, ask a follow-up question:

> Do you want to grow your own channel, or provide services to YouTube creators?

Do not silently choose one path when the answer is ambiguous.

## Journey configuration

The frontend should load a journey configuration instead of assuming every user has prospects.

```ts
interface JourneyConfig {
  id: EarningMethod
  label: string
  description: string
  planId: string
  primaryAction: string
  modules: string[]
  metrics: string[]
  monetizationStages: string[]
  requiresProspects: boolean
  requiresDeals: boolean
}

interface ContentContext {
  journey: JourneyConfig
  niche: NicheContext
  startingStage: StartingStage
  constraints: JourneyAnswers
}
```

Example for an owned YouTube channel:

```json
{
  "id": "youtube_owned_channel",
  "planId": "youtube-owned-30-day-v1",
  "primaryAction": "Publish your next video",
  "modules": ["channel", "audience", "ideas", "script", "production", "publishing", "analytics", "monetization"],
  "metrics": ["videosPublished", "uploadsThisWeek", "watchTime", "subscribers", "clickThroughRate", "returningViewers"],
  "monetizationStages": ["buildAudience", "affiliateOffers", "sponsorshipReadiness", "youtubePartnerProgram"],
  "requiresProspects": false,
  "requiresDeals": false
}
```

## Frontend behavior

Every journey-dependent screen must read the active journey configuration.

For `youtube_owned_channel`:

- Dashboard: next publishing action, content progress, and audience metrics.
- Plan: research, topic selection, scripting, recording, editing, publishing, and review.
- Coach: answer questions about content, audience, consistency, packaging, and monetization stage.
- Resources: topic research, scripting, thumbnails, analytics, and creator workflow.
- Progress: videos published, publishing consistency, watch time, subscribers, and learning milestones.
- Navigation: hide Prospects, Outreach, Pricing, and Revenue unless the user separately enables a service-selling journey.

For `youtube_services`:

- Keep the current prospect, outreach, pricing, delivery, and revenue workflow.
- Coach users on finding creators, creating samples, outreach, follow-ups, and client delivery.

## Niche adaptation rules

Every plan item should be built from three layers:

1. **Universal action:** the skill required by the earning method.
2. **Niche application:** who the user serves or creates for, what problem matters, and what examples fit.
3. **Stage and constraint adjustment:** what a beginner can do with the user's available time, budget, skills, and equipment.

For example, the universal action “research the audience” becomes:

- fitness: identify beginner questions about home workouts;
- gaming: identify search demand around a specific game and player level;
- beauty: identify recurring product or routine questions;
- real estate: identify local buyer or seller concerns;
- education: identify a learner outcome and common confusion;
- food: identify recipes, diets, ingredients, and audience constraints.

The app should adapt these areas for every niche:

- audience description;
- common problems and desired outcomes;
- topic and offer ideas;
- examples and terminology;
- discovery channels;
- outreach language when the journey involves selling;
- risks, restrictions, and claims;
- monetization options;
- success metrics.

Do not assume every niche has the same audience, platform, price range, legal constraints, or monetization path. Health, finance, legal, and other sensitive niches require cautious educational language and must not produce unsupported professional claims.

Use a fallback content generator for uncatalogued niches. It should produce a draft plan from the niche context, then save the generated plan with a version so the user can continue consistently.

Shared components such as account settings, notifications, lessons, task completion, and coach conversations should remain reusable.

## Backend changes required

### 1. Journey catalog

Add a versioned journey catalog table or equivalent configuration source.

Suggested fields:

```text
journey_id
version
label
description
plan_id
status                 -- draft, active, retired
config_json
created_at
updated_at
```

### 2. User enrollment

Store the user's selected journey independently from their profile.

```text
enrollment_id
user_id
journey_id
journey_version
niche
starting_stage
answers_json
started_at
completed_at
status                 -- active, paused, completed, abandoned
```

A user may have more than one enrollment over time. Preserve old enrollment progress when they switch journeys.

### 3. Journey plan and progress

Plans and progress must be journey-specific.

```text
plan_id
journey_id
journey_version
day_number
title
theme
mission
tasks_json
lesson_id
xp
```

```text
progress_id
enrollment_id
day_number
status                 -- locked, available, in_progress, completed, skipped
task_state_json
notes_json
completed_at
```

Do not calculate progress from a global prospect or lesson count.

### 4. Journey metrics

Use a flexible metric event model so each journey can track its own outcomes.

```text
metric_event_id
user_id
enrollment_id
metric_key
value_number
value_text
occurred_at
metadata_json
```

Examples:

- `videos_published = 1`
- `watch_time_minutes = 84`
- `subscribers = 127`
- `prospects_contacted = 10`
- `client_revenue = 250`

### 5. Niche profile and content generation

Add a persisted niche profile so all app surfaces use the same interpretation of the user's niche.

```text
niche_profile_id
enrollment_id
raw_input
normalized_label
audience
problem_or_desire
allowed_claims_json
restricted_topics_json
example_terms_json
monetization_options_json
source                   -- catalog, user_confirmed, ai_generated
version
```

Generate or update this profile during onboarding and when the user changes their niche. Do not let each screen independently interpret the raw niche string.

### 6. AI context

AI requests must receive the active enrollment, journey, and niche profile, not only `path` and `niche`.

```json
{
  "journeyId": "youtube_owned_channel",
  "journeyVersion": 1,
  "niche": "fitness for beginners",
  "nicheProfile": {
    "audience": "adults starting home workouts",
    "problemOrDesire": "simple, sustainable beginner routines",
    "exampleTerms": ["home workout", "beginner routine", "mobility"],
    "restrictedTopics": ["diagnosing injuries", "guaranteed medical results"]
  },
  "startingStage": "idea",
  "constraints": {
    "weeklyTime": "5 hours",
    "budget": "under $50",
    "equipment": ["phone"]
  },
  "currentDay": 4,
  "currentMission": "Choose and validate three video topics",
  "metrics": {
    "videosPublished": 0,
    "subscribers": 0
  }
}
```

The coach must use the journey's vocabulary and metrics. It must not mention prospects, clients, outreach, or pricing for an owned-channel journey unless the user explicitly asks about adding a service offer.

## API endpoints

The backend should expose or extend these endpoints:

```text
GET  /journeys
GET  /journeys/:journeyId
POST /enrollments
GET  /enrollments/active
POST /enrollments/:id/switch
GET  /enrollments/:id/plan
GET  /enrollments/:id/progress
PUT  /enrollments/:id/progress/:day
POST /enrollments/:id/metrics
GET  /enrollments/:id/metrics
POST /ai/coach
POST /ai/playbook
POST /niche-profiles/resolve
```

All enrollment, progress, and metric endpoints must require authentication and verify that the requesting user owns the enrollment.

## Acceptance criteria

1. A new user choosing “grow my own YouTube channel” never sees prospects or outreach in the primary journey.
2. A user choosing “sell services to YouTube creators” sees the current service-selling workflow.
3. The coach receives the active journey context on every request.
4. Switching journeys preserves the old journey's progress.
5. Metrics shown on the dashboard match the active journey.
6. Plans are versioned so content changes do not corrupt existing enrollments.
7. Unsupported earning methods produce a clear “coming soon” state instead of an unrelated plan.
8. A niche outside the initial catalog still receives a coherent plan for its selected earning method.
9. Changing the niche updates future content without rewriting completed history.
10. Sensitive niches receive appropriate restrictions and do not generate unsupported guarantees.

