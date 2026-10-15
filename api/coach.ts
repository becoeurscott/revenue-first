import { clip, describeContext, flushPostHog, methodology, trackGeneration, json, readAiObservability, readContext, sameOrigin } from './_lib/shared.js'
import { accountId, coachUsage, refundCoachMessage, reserveCoachMessage, tier, type CoachUsage, type Tier } from './_lib/access.js'
import { LlmError, MODELS, complete, llmConfigured, llmErrorResponse } from './_lib/llm.js'

/**
 * The AI Coach. The iOS app calls it with the user's Vaulten access token (`Authorization: Bearer …`);
 * every message counts against the plan's allowance (see COACH_LIMITS) and is checked here, never in
 * the app. GET returns the caller's current allowance. The web prototype keeps its same-origin path.
 */

/** Coaching answers are short and frequent, so they run on the fast model; the one-off personal program uses the smart one. */
const COACH_MODEL = MODELS.fast
/** Only the latest turns are sent: older context costs tokens on every message and rarely changes the answer. */
const MAX_TURNS = 12

const COACH_STYLE = `You are chatting inside the app. Answer the user's question directly for their journey, niche and stage, using the journey's own vocabulary and numbers.
- Keep replies short: usually 3-8 sentences or a short list. Use plain text with simple "- " bullets, no headings, no markdown tables.
- Give one clear next action they can do today.
- When an answer depends on current facts (platform rules, rates, tool pricing), say that it can change and tell them where to check.
- Never invent statistics or sources.`

export async function GET(req: Request): Promise<Response> {
  const userId = await accountId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)
  const usage = await coachUsage(userId, await tier(userId))
  if (!usage) return json({ error: 'usage_unavailable' }, 503)
  return json({ usage })
}

export async function POST(req: Request): Promise<Response> {
  if (!llmConfigured()) return json({ error: 'ai_not_configured' }, 503)

  // App callers are metered per account; anything else must be the same-site web prototype.
  let account: { id: string; tier: Tier } | null = null
  if (req.headers.get('authorization')) {
    const id = await accountId(req)
    if (!id) return json({ error: 'unauthorized' }, 401)
    account = { id, tier: await tier(id) }
  } else if (!sameOrigin(req)) {
    return json({ error: 'forbidden' }, 403)
  }

  const body = (await req.json().catch(() => null)) as { context?: unknown; playbookSummary?: unknown; messages?: unknown; ai?: unknown } | null
  const ctx = readContext(body?.context)
  if (ctx === 'unsupported') return json({ error: 'unsupported_journey' }, 400)
  const ai = readAiObservability(body?.ai)
  const raw = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : []
  const messages: { role: 'user' | 'assistant'; content: string }[] = raw
    .map((m: { from?: unknown; text?: unknown }) => ({
      role: m.from === 'coach' ? ('assistant' as const) : ('user' as const),
      content: clip(m.text, 2000),
    }))
    .filter((m) => m.content.trim())
  // The API needs the conversation to start and end on a user turn.
  while (messages.length && messages[0].role !== 'user') messages.shift()
  if (!ctx || !ai || !messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400)

  const context = [describeContext(ctx), body?.playbookSummary ? `\nTheir niche playbook summary: ${clip(body.playbookSummary, 600)}` : ''].join('')
  const system = [
    { text: methodology(ctx.journeyId), cache: true },
    { text: `${COACH_STYLE}\n\nAbout this user:\n${context}` },
  ]

  let usage: CoachUsage | null = null
  if (account) {
    const reserved = await reserveCoachMessage(account.id, account.tier)
    if (!reserved) return json({ error: 'usage_unavailable' }, 503)
    if (!reserved.ok) return json({ error: 'coach_limit_reached', usage: reserved.usage }, 402)
    usage = reserved.usage
  }

  const startedAt = Date.now()
  let answered = false
  try {
    // No web search: on OpenRouter it runs (and bills) on every message, not only when facts are current.
    const response = await complete({ model: COACH_MODEL, system, messages, maxTokens: 1500, timeoutMs: 80_000 })
    trackGeneration(ai, 'coach', response, startedAt)
    const text = response.text
    if (!text) return json({ error: 'empty' }, 502)
    answered = true
    return json({ reply: text, usage })
  } catch (error) {
    if (error instanceof LlmError) {
      const r = llmErrorResponse(error)
      return json(r.body, r.status)
    }
    throw error
  } finally {
    // Failed answers don't use up the allowance.
    if (account && !answered) await refundCoachMessage(account.id, account.tier)
    await flushPostHog()
  }
}
