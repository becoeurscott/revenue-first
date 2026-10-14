import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { JOURNEYS, MODEL, clip, flushPostHog, getClient, isJourneyId, json, readAiObservability, sameOrigin, trackGeneration } from '../_lib/shared.js'

const NICHE_RULES = `You turn a beginner's free-text niche into a structured niche profile for FirstRevenue, an app that coaches people to their first online income.
The profile is shared by every screen and by the coach, so it must be precise, neutral and safe.
- Keep the user's specificity. Never replace an unfamiliar niche with a generic one ("online business", "content") and never switch the earning method.
- tooBroad is true only when the input is too vague to write useful, specific guidance (e.g. "business", "videos", "make money"). Then ask exactly one short follow-up question in followUpQuestion; otherwise followUpQuestion is null.
- allowedClaims: what someone in this niche may honestly say as a beginner. restrictedTopics: what to avoid (professional advice, guarantees, unsafe or rule-breaking content).
- For health, finance, legal, children and other sensitive niches, restrictedTopics must cover professional advice and guaranteed outcomes, and cautionNote is one sentence on staying educational. Otherwise cautionNote is null.
- monetizationOptions must fit the earning method: services are paid packages and retainers; an owned channel is affiliates, sponsorships, products and platform income in stage order.
- exampleTerms are 3-5 words or short phrases this audience actually searches for or uses.`

const NicheProfileSchema = z.object({
  normalizedLabel: z.string().describe('Short, specific label in the user\'s words, e.g. "Beginner home workouts"'),
  audience: z.string().describe('Who exactly is served, lowercase phrase, e.g. "adults starting home workouts"'),
  problemOrDesire: z.string().describe('What that audience wants or struggles with, lowercase phrase'),
  allowedClaims: z.array(z.string()),
  restrictedTopics: z.array(z.string()),
  exampleTerms: z.array(z.string()),
  monetizationOptions: z.array(z.string()),
  cautionNote: z.string().nullable(),
  tooBroad: z.boolean(),
  followUpQuestion: z.string().nullable(),
})

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403)
  const client = getClient()
  if (!client) return json({ error: 'ai_not_configured' }, 503)

  const body = (await req.json().catch(() => null)) as { journeyId?: unknown; niche?: unknown; detail?: unknown; version?: unknown; ai?: unknown } | null
  const ai = readAiObservability(body?.ai)
  if (body?.journeyId && !isJourneyId(body.journeyId)) return json({ error: 'unsupported_journey' }, 400)
  const niche = clip(body?.niche, 80).trim()
  const detail = clip(body?.detail, 80).trim()
  if (!isJourneyId(body?.journeyId) || !niche || !ai) return json({ error: 'bad_request' }, 400)
  const journey = JOURNEYS[body.journeyId]

  const startedAt = Date.now()
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(NicheProfileSchema) },
      system: [{ type: 'text', text: NICHE_RULES, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Earning method: ${journey.label}${journey.sellsServices ? ' (sells a service to clients)' : ' (owns the channel; no clients)'}\nNiche as typed: ${niche}${detail ? `\nFollow-up answer: ${detail}` : ''}`,
      }],
    })
    trackGeneration(ai, 'niche', response, startedAt)
    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422)
    const profile = response.parsed_output
    if (!profile) return json({ error: 'bad_output' }, 502)
    return json({
      nicheProfile: {
        ...profile,
        rawInput: detail ? `${niche} — ${detail}` : niche,
        source: 'ai_generated',
        version: Number(body.version) || 1,
      },
    })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429)
    if (error instanceof Anthropic.APIError) return json({ error: 'upstream', status: error.status }, 502)
    throw error
  } finally {
    await flushPostHog()
  }
}
