import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { METHODOLOGY, MODEL, clip, describeUser, getClient, json, readUser, sameOrigin } from './_lib/shared.js'

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

interface PlanDay {
  day: number
  theme: string
  mission: string
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403)
  const client = getClient()
  if (!client) return json({ error: 'ai_not_configured' }, 503)

  const body = (await req.json().catch(() => null)) as { user?: unknown; plan?: unknown } | null
  const user = readUser(body?.user)
  if (!user) return json({ error: 'bad_request' }, 400)
  const plan: PlanDay[] = Array.isArray(body?.plan)
    ? body.plan.slice(0, 30).map((d: Record<string, unknown>, i: number) => ({ day: Number(d.day) || i + 1, theme: clip(d.theme, 80), mission: clip(d.mission, 160) }))
    : []

  const request = [
    'Build this user\'s niche playbook.',
    '',
    describeUser(user),
    '',
    'Their 30-day plan (write one daily tip per day, in this order):',
    ...plan.map((d) => `Day ${d.day} — ${d.theme}: ${d.mission}`),
  ].join('\n')

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: zodOutputFormat(PlaybookSchema) },
      system: [{ type: 'text', text: METHODOLOGY, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: request }],
    })
    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422)
    if (!response.parsed_output) return json({ error: 'bad_output' }, 502)
    return json({ playbook: response.parsed_output })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429)
    if (error instanceof Anthropic.APIError) return json({ error: 'upstream', status: error.status }, 502)
    throw error
  }
}
