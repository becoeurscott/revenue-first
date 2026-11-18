import { PostHog } from 'posthog-node'


const BASE_RULES = `Rules:
- Be concrete and specific to the user's journey, niche, starting stage, time, budget and equipment. Name real platforms, real search queries, real wording.
- Be honest: no guaranteed income, no get-rich-quick claims, realistic numbers and timelines. Say plainly when something is unlikely.
- Never recommend paying gurus, buying courses, borrowing money, spam, fake reviews or engagement, scraping private data, or anything against platform rules or the law.
- Respect the niche profile's restricted topics. In health, finance, legal and other sensitive niches use cautious, educational language and never make professional claims or promise results.
- If the niche is a poor fit for the journey, say so briefly and suggest the closest niche that works.
- Write for a beginner: short sentences, no jargon without a one-line explanation.`

const SERVICE_METHOD = `How first revenue actually happens for beginners selling a service (the approach you teach):
1. Narrow to one niche so the offer, the examples and the outreach speak the client's language. "Fitness YouTubers" beats "creators"; "dentists in Lyon" beats "local businesses".
2. Lead with proof, not promises: a free sample or a free 3-point audit for that specific prospect.
3. Volume of specific outreach is the engine: 10-20 personalised messages a day, a follow-up after 3-4 days, then a second one. Most first clients come from follow-ups.
4. Start with a small, easy "yes": one paid trial package at a price the client can approve without a meeting, then convert to a monthly retainer once results show.
5. Price from the client's value and the niche's norms, with honest beginner ranges. Never inflate.
6. Track everything: prospects, replies, deals. Change one thing at a time when replies are low (first line, sample, niche).
7. Use free or cheap tools. A beginner never needs a paid course, ads or debt to land a first client.`

/** Server-side journey catalog. Only these journeys can be coached; anything else is rejected, never substituted. */
export const JOURNEYS = {
  youtube_services: {
    label: 'Services for YouTube creators',
    sellsServices: true,
    method: `The user sells a done-for-you service to YouTube creators, starting with short-form clips cut from creators' long videos (TikTok, Reels, Shorts), paid per clip, per package or per month, then growing into editing and channel help.\n\n${SERVICE_METHOD}`,
  },
  freelance_services: {
    label: 'Freelance services for businesses',
    sellsServices: true,
    method: `The user sells a done-for-you service to businesses. Their starting offer is Google Business Profile optimisation: they find businesses in their niche with weak Google profiles (few photos, few reviews, missing services, wrong hours), audit them for free, then charge to fix and maintain the profile.\n\n${SERVICE_METHOD}`,
  },
  youtube_owned_channel: {
    label: 'Grow your own YouTube channel',
    sellsServices: false,
    method: `The user is building their OWN YouTube channel. They have no clients and are not selling a service. Speak in the vocabulary of a channel: audience, viewers, topics, ideas, scripts, hooks, recording, editing, titles, thumbnails, packaging, publishing schedule, analytics (click-through rate, average view duration, watch time, returning viewers, traffic sources), community, and monetization. Never talk about prospects, clients, outreach, cold messages or pricing a service unless the user explicitly asks about adding a service offer.

How an owned channel actually grows for beginners (the approach you teach):
1. One clear audience and promise: who the channel is for and what they get from every video.
2. Topics come from demand: search autocomplete, comments on similar channels, Google Trends, questions the audience already asks.
3. Packaging first: the title and thumbnail decide whether anyone watches; write them before the script.
4. Hook and deliver: the first 30 seconds confirm the title's promise; retention beats production value.
5. A phone, natural light and a free editor are enough. Consistency on a schedule the user can actually keep beats ambitious plans.
6. Review numbers weekly in YouTube Studio and change one thing at a time (title, thumbnail, hook, topic).
7. Monetize in stage order: build the audience, then affiliate links for products they really use (always disclosed), then sponsorship readiness (a simple media kit), then digital products, and the YouTube Partner Program when eligible. Never state Partner Program thresholds as fact; tell them to check the current requirements in YouTube Studio > Earn. Within 30 days the realistic goal is consistent publishing and a first small income attempt, not ad revenue.`,
  },
  digital_products: {
    label: 'Your first digital product',
    sellsServices: false,
    method: `The user makes and sells their OWN small digital product (guide, template, checklist, printable or mini-course). They have no clients and are not selling a service.

How a first digital product actually sells for beginners (the approach you teach):
1. One audience, one painful problem, one promise: "I help [audience] [get result] without [frustration]".
2. Validate before building: real questions people ask online, what already sells for that problem and at what price.
3. Small version 1 that can be finished in about a week with free tools and only licensed fonts and images.
4. One selling platform (Gumroad, Payhip, Etsy, Stan, Ko-fi...), a clear sales page and an honest beginner price, usually $5-$30.
5. A first sale attempt by Day 14: share it with the people it is for, then helpful content and a small email list that point to it.
6. Read visits, conversion and buyer feedback; improve one thing at a time. Within 30 days the realistic goal is a launched product, real feedback and first sale attempts, not passive income.`,
  },
  affiliate_content: {
    label: 'Affiliate content',
    sellsServices: false,
    method: `The user earns affiliate commissions by publishing honest reviews, comparisons and recommendations for products in their niche. They have no clients and are not selling a service.

How affiliate content actually earns for beginners (the approach you teach):
1. Pick a niche where people research before they buy, and one platform to publish on (short videos, a blog, Pinterest or YouTube).
2. Join legitimate programs (Amazon Associates, brand programs, networks) and follow each program's rules.
3. Content answers buying questions: "best X for Y", "X vs Y", honest reviews of products the user has used or researched properly.
4. Always disclose affiliate links clearly. Never fake reviews, fake results or fake urgency.
5. Publish consistently, track clicks and conversions per piece, and do more of what gets clicks.
6. Within 30 days the realistic goal is a body of helpful content and a first click or commission, not a full income.`,
  },
  creator_brand: {
    label: 'Personal creator brand',
    sellsServices: false,
    method: `The user grows a personal creator brand on social media (TikTok, Instagram, YouTube Shorts...) and earns from small brand deals, UGC gigs and later their own offer. They have no clients for a done-for-you service.

How a beginner creator brand actually starts earning (the approach you teach):
1. One clear niche and promise so a stranger knows in two seconds why to follow.
2. Repeatable formats and a posting rhythm the user can keep; hooks in the first second.
3. Engage with the community and similar creators every day; growth comes from consistency and replies.
4. Build proof early: a simple media kit and 2-3 sample UGC videos, even before followers are high.
5. Pitch small brands with a short, specific message; start with fair beginner rates and always disclose sponsored content.
6. Within 30 days the realistic goal is a consistent account, a media kit and first pitches or a first small paid deal.`,
  },
} as const

export type JourneyId = keyof typeof JOURNEYS

/** Stable per journey, so each journey's prompt prefix is served from the prompt cache. */
export const methodology = (id: JourneyId) =>
  `You are the coach inside FirstRevenue, an app that takes complete beginners from zero to their first money online in 30 days. Each user follows one journey, chosen by how they want to earn.\n\nThis user's journey: ${JOURNEYS[id].label}.\n${JOURNEYS[id].method}\n\n${BASE_RULES}`

let posthog: PostHog | null | undefined

function getPostHog(): PostHog | null {
  if (posthog !== undefined) return posthog
  const apiKey = process.env.VITE_POSTHOG_KEY
  const host = process.env.VITE_POSTHOG_HOST
  // Analytics is optional: without it the AI endpoints must keep working.
  posthog = apiKey && host ? new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 }) : null
  return posthog
}

/** Records one Claude call in PostHog LLM analytics (model, tokens, latency) — never the user's text. */
export function trackGeneration(
  ai: AiObservabilityContext,
  feature: 'coach' | 'playbook' | 'niche' | 'program',
  response: { model: string; stop_reason: string | null; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null } },
  startedAt: number,
) {
  getPostHog()?.capture({
    distinctId: ai.distinctId,
    event: '$ai_generation',
    properties: {
      $ai_trace_id: ai.traceId,
      $ai_session_id: ai.sessionId,
      $ai_provider: 'openrouter',
      $ai_model: response.model,
      $ai_input_tokens: response.usage.input_tokens,
      $ai_output_tokens: response.usage.output_tokens,
      $ai_cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      $ai_latency: (Date.now() - startedAt) / 1000,
      $ai_stop_reason: response.stop_reason,
      feature,
    },
  })
}

export async function flushPostHog(): Promise<void> {
  await getPostHog()?.flush()
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** These endpoints spend real money per call: only accept same-site browser requests. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export const clip = (value: unknown, max: number) => String(value ?? '').slice(0, max)

export interface AiObservabilityContext {
  distinctId: string
  sessionId: string
  traceId: string
}

const validAiId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200 && /^[A-Za-z0-9_~.@()!'|:-]+$/.test(value)

export function readAiObservability(raw: unknown): AiObservabilityContext | null {
  if (!raw || typeof raw !== 'object') return null
  const context = raw as Record<string, unknown>
  if (!validAiId(context.distinctId) || !validAiId(context.sessionId) || !validAiId(context.traceId)) return null
  return { distinctId: context.distinctId, sessionId: context.sessionId, traceId: context.traceId }
}

export interface NicheProfile {
  normalizedLabel: string
  audience: string
  problemOrDesire: string
  allowedClaims: string[]
  restrictedTopics: string[]
  exampleTerms: string[]
  monetizationOptions: string[]
}

/** Everything a request knows about the user's active enrollment. */
export interface JourneyContext {
  journeyId: JourneyId
  journeyVersion: number
  niche: string
  nicheProfile: NicheProfile | null
  startingStage: string
  constraints: { weeklyTime: string; budget: string; equipment: string[]; skills: string[]; location: string }
  name: string
  goal: string
  currentDay: number | null
  currentMission: string
  metrics: Record<string, number>
  /** Month of the journey (1 = the first 30-day plan) and what this month is aimed at, from the last review. */
  month: number
  focus: string
  /** Route answers from onboarding ("Video format: Shorts first") and the plan notes they imply. */
  setup: string[]
}

const strings = (v: unknown, max: number, n = 8) => (Array.isArray(v) ? v.slice(0, n).map((x) => clip(x, max).trim()).filter(Boolean) : [])
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export const isJourneyId = (v: unknown): v is JourneyId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(JOURNEYS, v)

export function readNicheProfile(raw: unknown): NicheProfile | null {
  const n = obj(raw)
  const normalizedLabel = clip(n.normalizedLabel, 80).trim()
  if (!normalizedLabel) return null
  return {
    normalizedLabel,
    audience: clip(n.audience, 160),
    problemOrDesire: clip(n.problemOrDesire, 160),
    allowedClaims: strings(n.allowedClaims, 120),
    restrictedTopics: strings(n.restrictedTopics, 120),
    exampleTerms: strings(n.exampleTerms, 60),
    monetizationOptions: strings(n.monetizationOptions, 120),
  }
}

/** Null for a missing niche; `unsupported` for a journey this server can't coach (never mapped to another one). */
export function readContext(raw: unknown): JourneyContext | 'unsupported' | null {
  const c = obj(raw)
  if (!c.journeyId) return null
  if (!isJourneyId(c.journeyId)) return 'unsupported'
  const niche = clip(c.niche, 80).trim()
  if (!niche) return null
  const k = obj(c.constraints)
  const metrics: Record<string, number> = {}
  for (const [key, value] of Object.entries(obj(c.metrics)).slice(0, 12)) {
    if (/^[A-Za-z_]{1,40}$/.test(key) && typeof value === 'number' && Number.isFinite(value)) metrics[key] = value
  }
  const day = Number(c.currentDay)
  return {
    journeyId: c.journeyId,
    journeyVersion: Number(c.journeyVersion) || 1,
    niche,
    nicheProfile: readNicheProfile(c.nicheProfile),
    startingStage: clip(c.startingStage, 40),
    constraints: {
      weeklyTime: clip(k.weeklyTime, 40),
      budget: clip(k.budget, 40),
      equipment: strings(k.equipment, 40),
      skills: strings(k.skills, 40),
      location: clip(k.location, 60),
    },
    name: clip(c.name, 40),
    goal: clip(c.goal, 60),
    currentDay: Number.isInteger(day) && day >= 1 && day <= 30 ? day : null,
    currentMission: clip(c.currentMission, 160),
    metrics,
    month: Number.isInteger(Number(c.month)) && Number(c.month) >= 1 ? Math.min(Number(c.month), 120) : 1,
    focus: clip(c.focus, 200),
    setup: strings(c.setup, 200, 16),
  }
}

export const describeContext = (c: JourneyContext) => {
  const n = c.nicheProfile
  return [
    `Journey: ${JOURNEYS[c.journeyId].label} (v${c.journeyVersion})`,
    `Niche: ${n?.normalizedLabel ?? c.niche}`,
    n?.audience && `Audience: ${n.audience}`,
    n?.problemOrDesire && `What they want: ${n.problemOrDesire}`,
    n?.exampleTerms.length ? `Niche terms: ${n.exampleTerms.join(', ')}` : '',
    n?.restrictedTopics.length ? `Avoid (restricted in this niche): ${n.restrictedTopics.join('; ')}` : '',
    n?.monetizationOptions.length ? `Monetization options for this niche: ${n.monetizationOptions.join('; ')}` : '',
    c.name && `Name: ${c.name}`,
    c.startingStage && `Starting stage: ${c.startingStage}`,
    c.constraints.weeklyTime && `Time per week: ${c.constraints.weeklyTime}`,
    c.constraints.budget && `Budget: ${c.constraints.budget}`,
    c.constraints.skills.length ? `Skills: ${c.constraints.skills.join(', ')}` : '',
    c.constraints.equipment.length ? `Equipment: ${c.constraints.equipment.join(', ')}` : '',
    c.constraints.location && `Location: ${c.constraints.location}`,
    c.setup.length ? `Their setup (shape the missions to it, e.g. no on-camera tasks for a faceless creator):\n- ${c.setup.join('\n- ')}` : '',
    c.goal && `First goal: ${c.goal}`,
    c.month > 1 && `This is month ${c.month} of their journey; earlier months are done. Build on what they already did instead of repeating Month 1 basics.`,
    c.focus && `This month's focus, from their last monthly review: ${c.focus}. Aim every day of the plan at it.`,
    c.currentDay && `Current day: ${c.currentDay} of 30${c.currentMission ? ` — ${c.currentMission}` : ''}`,
    Object.keys(c.metrics).length ? `Current numbers: ${Object.entries(c.metrics).map(([k, v]) => `${k} ${v}`).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
