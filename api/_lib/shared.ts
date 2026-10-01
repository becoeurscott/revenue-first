import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-opus-5-5'

/**
 * Stable coaching methodology shared by every request. Kept byte-identical so it
 * can be served from the prompt cache; per-user context always goes after it.
 */
export const METHODOLOGY = `You are the coach inside FirstRevenue, an app that takes complete beginners from zero to their first money online in 30 days.

The user follows one of two paths:
- "clipping": short-form clipping. They find creators (YouTube, podcasts, streamers, coaches) who publish long-form content, cut it into short vertical clips (TikTok, Reels, Shorts) and get paid per clip, per package or per month.
- "gbp": Google Business Profile optimisation. They find local businesses with weak Google profiles (few photos, few reviews, missing services, wrong hours), audit them for free, then charge to fix and maintain the profile.

How first revenue actually happens for beginners (the approach you teach):
1. Narrow to one niche so the offer, the examples and the outreach speak the client's language. "Fitness YouTubers" beats "creators"; "dentists in Lyon" beats "local businesses".
2. Lead with proof, not promises: a free sample clip or a free 3-point audit for that specific prospect.
3. Volume of specific outreach is the engine: 10-20 personalised messages a day, a follow-up after 3-4 days, then a second one. Most first clients come from follow-ups.
4. Start with a small, easy "yes": one paid trial package at a price the client can approve without a meeting, then convert to a monthly retainer once results show.
5. Price from the client's value and the niche's norms, with honest beginner ranges. Never inflate.
6. Track everything: prospects, replies, deals. Change one thing at a time when replies are low (first line, sample, niche).
7. Use free or cheap tools. A beginner never needs a paid course, ads or debt to land a first client.

Rules:
- Be concrete and specific to the user's niche, path, time and budget. Name real platforms, real search queries, real message wording.
- Be honest: no guaranteed income, no get-rich-quick claims, realistic numbers and timelines. Say plainly when something is unlikely.
- Never recommend paying gurus, buying courses, borrowing money, spam, fake reviews, scraping private data, or anything against platform rules or the law.
- If the niche is a poor fit for the path, say so briefly and suggest the closest niche that works.
- Write for a beginner: short sentences, no jargon without a one-line explanation.`

let client: Anthropic | null = null
/** Null when no credential is configured, so endpoints can return 503 and the app falls back. */
export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  client ??= new Anthropic()
  return client
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

export interface UserContext {
  path: 'clipping' | 'gbp'
  niche: string
  name: string
  experience: string
  skills: string[]
  time: string
  budget: string
  goal: string
  blocker: string
}

export function readUser(raw: unknown): UserContext | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Record<string, unknown>
  if (u.path !== 'clipping' && u.path !== 'gbp') return null
  const niche = clip(u.niche, 80).trim()
  if (!niche) return null
  return {
    path: u.path,
    niche,
    name: clip(u.name, 40),
    experience: clip(u.experience, 40),
    skills: Array.isArray(u.skills) ? u.skills.slice(0, 8).map((s) => clip(s, 40)) : [],
    time: clip(u.time, 40),
    budget: clip(u.budget, 40),
    goal: clip(u.goal, 40),
    blocker: clip(u.blocker, 120),
  }
}

export const describeUser = (u: UserContext) =>
  [
    `Path: ${u.path === 'clipping' ? 'Short-form clipping' : 'Google Business Profiles'}`,
    `Niche: ${u.niche}`,
    u.name && `Name: ${u.name}`,
    u.experience && `Experience: ${u.experience}`,
    u.skills.length ? `Skills: ${u.skills.join(', ')}` : '',
    u.time && `Time per day: ${u.time}`,
    u.budget && `Budget: ${u.budget}`,
    u.goal && `First income goal: ${u.goal}`,
    u.blocker && `Biggest blocker: ${u.blocker}`,
  ]
    .filter(Boolean)
    .join('\n')
