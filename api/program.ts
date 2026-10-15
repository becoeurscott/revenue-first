import { z } from 'zod'
import { clip, describeContext, flushPostHog, methodology, trackGeneration, json, readAiObservability, readContext } from './_lib/shared.js'
import { accountId, tier } from './_lib/access.js'
import { LlmError, MODELS, complete, llmConfigured, llmErrorResponse } from './_lib/llm.js'

/**
 * Writes the user's personal 30-day program for the iOS app.
 *
 * `preview` writes the program header and Week 1 only — that is all a free account ever gets.
 * `full` writes Days 8–30 and only runs once RevenueCat confirms the caller's Premium entitlement,
 * so the paid part of the program is never generated (or paid for in tokens) for free accounts.
 *
 * Callers authenticate with their Vaulten access token (`Authorization: Bearer …`), checked against
 * the Vaulten API. Env: ANTHROPIC_API_KEY, REVENUECAT_SECRET_KEY, optional VAULTEN_API_URL.
 */

const FREE_DAYS = 7
const TOTAL_DAYS = 30

const DaySchema = z.object({
  day: z.number().int(),
  title: z.string().describe("Mission headline written for this user's niche, at most 7 words"),
  objective: z.string().describe('One sentence: what they achieve today, in their niche'),
  steps: z.array(z.string()).describe('Exactly 3 concrete steps for today, specific to their niche, time and budget, each under 25 words'),
  tip: z.string().describe('One niche-specific example, wording or shortcut for today'),
  deliverable: z.string().describe('What exists at the end of today, e.g. "A one-sentence product promise"'),
})

const WeekSchema = z.object({
  week: z.number().int(),
  title: z.string().describe('Short week title, at most 4 words'),
  outcome: z.string().describe('One sentence: what the user has at the end of the week'),
})

const PreviewSchema = z.object({
  title: z.string().describe('Program name for this user, at most 8 words, e.g. "Your Meal-Prep Printables Launch Plan"'),
  summary: z.string().describe('2 sentences: what the 30 days build, and the honest realistic outcome by Day 30'),
  weeks: z.array(WeekSchema).describe('Week 1 only'),
  days: z.array(DaySchema).describe('Exactly days 1 to 7, in order'),
})

const FullSchema = z.object({
  weeks: z.array(WeekSchema).describe('Weeks 2, 3 and 4, in order'),
  days: z.array(DaySchema).describe('Exactly days 8 to 30, in order'),
})

interface SkeletonDay {
  day: number
  week: number
  theme: string
  mission: string
  goal: string
}

function readSkeleton(raw: unknown): SkeletonDay[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, TOTAL_DAYS).map((d: Record<string, unknown>, i: number) => ({
    day: Number(d.day) || i + 1,
    week: Number(d.week) || Math.min(4, Math.floor(i / 7) + 1),
    theme: clip(d.theme, 80),
    mission: clip(d.mission, 160),
    goal: clip(d.goal, 160),
  }))
}

export async function POST(req: Request): Promise<Response> {
  if (!llmConfigured()) return json({ error: 'ai_not_configured' }, 503)

  const userId = await accountId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as { scope?: unknown; context?: unknown; plan?: unknown; program?: unknown; ai?: unknown } | null
  const scope = body?.scope === 'full' ? 'full' : body?.scope === 'preview' ? 'preview' : null
  const ctx = readContext(body?.context)
  const ai = readAiObservability(body?.ai)
  if (ctx === 'unsupported') return json({ error: 'unsupported_journey' }, 400)
  if (!scope || !ctx || !ai) return json({ error: 'bad_request' }, 400)

  // The paid weeks are never written for a free account, whatever the client says.
  if (scope === 'full' && (await tier(userId)) === 'free') return json({ error: 'payment_required' }, 402)

  const [from, to] = scope === 'preview' ? [1, FREE_DAYS] : [FREE_DAYS + 1, TOTAL_DAYS]
  const skeleton = readSkeleton(body?.plan).filter((d) => d.day >= from && d.day <= to)
  if (skeleton.length !== to - from + 1) return json({ error: 'bad_request' }, 400)
  const header = body?.program && typeof body.program === 'object' ? (body.program as Record<string, unknown>) : {}

  const request = [
    scope === 'preview'
      ? `Write the program header and Days ${from}-${to} of this user's personal 30-day program.`
      : `Write Days ${from}-${to} and Weeks 2-4 of this user's personal 30-day program. Days 1-${FREE_DAYS} are already written under the program "${clip(header.title, 120)}": ${clip(header.summary, 400)}`,
    '',
    describeContext(ctx),
    '',
    'Each day keeps the mission below (the app has a checklist and lesson for it). Rewrite it for this user: their niche, audience, starting stage, weekly time and budget.',
    ...skeleton.map((d) => `Day ${d.day} (week ${d.week}) — ${d.theme}: ${d.mission} Goal: ${d.goal}`),
  ].join('\n')

  const startedAt = Date.now()
  try {
    const response = await complete({
      model: MODELS.smart,
      maxTokens: scope === 'preview' ? 8000 : 20000,
      schema: scope === 'preview' ? { name: 'program_preview', zod: PreviewSchema } : { name: 'program_full', zod: FullSchema },
      system: [{ text: methodology(ctx.journeyId), cache: true }],
      messages: [{ role: 'user', content: request }],
      timeoutMs: 230_000,
    })
    trackGeneration(ai, 'program', response, startedAt)
    const out = response.parsed as z.infer<typeof PreviewSchema> | z.infer<typeof FullSchema> | null
    if (!out) return json({ error: 'bad_output' }, 502)

    // One entry per expected day, in order; anything outside the scope is dropped.
    const days = skeleton.map((s) => out.days.find((d) => d.day === s.day)).filter((d) => d !== undefined)
    if (days.length !== skeleton.length) return json({ error: 'bad_output' }, 502)
    const weeks = out.weeks.filter((w) => (scope === 'preview' ? w.week === 1 : w.week >= 2 && w.week <= 4))
    return json({
      scope,
      journeyId: ctx.journeyId,
      ...(scope === 'preview' ? { title: (out as z.infer<typeof PreviewSchema>).title, summary: (out as z.infer<typeof PreviewSchema>).summary } : {}),
      weeks,
      days: days.map((d) => ({ ...d, steps: d.steps.slice(0, 4) })),
    })
  } catch (error) {
    if (error instanceof LlmError) {
      const r = llmErrorResponse(error)
      return json(r.body, r.status)
    }
    throw error
  } finally {
    await flushPostHog()
  }
}
