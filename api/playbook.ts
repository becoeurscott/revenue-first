import { z } from 'zod'
import { JOURNEYS, clip, describeContext, flushPostHog, methodology, trackGeneration, json, readAiObservability, readContext, sameOrigin } from './_lib/shared.js'
import { LlmError, MODELS, complete, llmConfigured, llmErrorResponse } from './_lib/llm.js'

const PlaybookSchema = z.object({
  niche: z.string().describe('The niche, cleaned up, e.g. "Fitness YouTubers"'),
  fit: z.string().describe('One honest sentence on how well this niche fits the path'),
  summary: z.string().describe('2-3 sentences: why clients in this niche pay, and the fastest route to a first client'),
  idealClients: z.array(z.string()).describe('4 specific client profiles to target'),
  offers: z
    .array(z.object({ name: z.string(), description: z.string(), priceRange: z.string(), whyItSells: z.string() }))
    .describe('3 beginner-friendly offers, cheapest first, with realistic price ranges in USD'),
  whereToFind: z.array(z.object({ channel: z.string(), how: z.string() })).describe('4 places to find these clients, with exact search queries or steps'),
  outreachTemplates: z
    .array(z.object({ title: z.string(), stage: z.enum(['First touch', 'Follow-up', 'Closing']), body: z.string() }))
    .describe('3 short messages (under 90 words) with [brackets] for personalisation: one first touch, one follow-up, one closing'),
  objections: z.array(z.object({ objection: z.string(), reply: z.string() })).describe('3 common objections in this niche and how to answer'),
  pitfalls: z.array(z.string()).describe('3 mistakes or scams to avoid in this niche'),
  dailyTips: z.array(z.string()).describe('Exactly 30 tips, one per day of the plan in order, each one sentence that applies that day\'s mission to this niche'),
})

export type Playbook = z.infer<typeof PlaybookSchema>

/** Owned-channel journeys have no clients, offers or outreach: audience, content and stage-ordered income instead. */
const ChannelPlaybookSchema = z.object({
  niche: z.string().describe('The niche, cleaned up, e.g. "Beginner home workouts"'),
  fit: z.string().describe('One honest sentence on how well this niche fits an owned YouTube channel'),
  summary: z.string().describe('2-3 sentences: who the channel serves, what it promises, and the fastest route to a consistent channel'),
  audience: z.array(z.string()).describe('4 specific viewer profiles the channel is for'),
  contentPillars: z.array(z.object({ pillar: z.string(), why: z.string() })).describe('3 recurring content themes with why viewers search for them'),
  videoIdeas: z
    .array(z.object({ title: z.string(), hook: z.string(), format: z.enum(['Long-form', 'Short']) }))
    .describe('10 video ideas with a packaged title and a one-sentence opening hook, grounded in real search demand'),
  packagingTips: z.array(z.string()).describe('4 title and thumbnail tips specific to this niche'),
  monetizationByStage: z
    .array(z.object({ stage: z.enum(['Build an audience', 'Affiliate offers', 'Sponsorship readiness', 'YouTube Partner Program']), ideas: z.array(z.string()) }))
    .describe('For each stage in order, 2 realistic income ideas for this niche. Never state Partner Program thresholds as fact.'),
  pitfalls: z.array(z.string()).describe('3 mistakes, claims or scams to avoid in this niche'),
  dailyTips: z.array(z.string()).describe("Exactly 30 tips, one per day of the plan in order, each one sentence that applies that day's mission to this niche"),
})

export type ChannelPlaybook = z.infer<typeof ChannelPlaybookSchema>

interface PlanDay {
  day: number
  theme: string
  mission: string
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403)
  if (!llmConfigured()) return json({ error: 'ai_not_configured' }, 503)

  const body = (await req.json().catch(() => null)) as { context?: unknown; plan?: unknown; ai?: unknown } | null
  const ctx = readContext(body?.context)
  const ai = readAiObservability(body?.ai)
  if (ctx === 'unsupported') return json({ error: 'unsupported_journey' }, 400)
  if (!ctx || !ai) return json({ error: 'bad_request' }, 400)
  const sellsServices = JOURNEYS[ctx.journeyId].sellsServices
  // The playbook only has service and own-channel shapes; other journeys get their plan from /api/program.
  if (!sellsServices && ctx.journeyId !== 'youtube_owned_channel') return json({ error: 'unsupported_journey' }, 400)
  const plan: PlanDay[] = Array.isArray(body?.plan)
    ? body.plan.slice(0, 30).map((d: Record<string, unknown>, i: number) => ({ day: Number(d.day) || i + 1, theme: clip(d.theme, 80), mission: clip(d.mission, 160) }))
    : []

  const request = [
    'Build this user\'s niche playbook.',
    '',
    describeContext(ctx),
    '',
    'Their 30-day plan (write one daily tip per day, in this order):',
    ...plan.map((d) => `Day ${d.day} — ${d.theme}: ${d.mission}`),
  ].join('\n')

  const startedAt = Date.now()
  try {
    const response = await complete<Playbook | ChannelPlaybook>({
      model: MODELS.smart,
      maxTokens: 16000,
      schema: sellsServices ? { name: 'service_playbook', zod: PlaybookSchema } : { name: 'channel_playbook', zod: ChannelPlaybookSchema },
      system: [{ text: methodology(ctx.journeyId), cache: true }],
      messages: [{ role: 'user', content: request }],
    })
    trackGeneration(ai, 'playbook', response, startedAt)
    if (!response.parsed) return json({ error: 'bad_output' }, 502)
    return json({ kind: sellsServices ? 'service' : 'channel', journeyId: ctx.journeyId, journeyVersion: ctx.journeyVersion, playbook: response.parsed })
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
