import Anthropic from '@anthropic-ai/sdk'
import { METHODOLOGY, MODEL, clip, describeUser, getClient, json, readUser, sameOrigin } from './_lib/shared.js'

const MAX_TURNS = 20

const COACH_STYLE = `You are chatting inside the app. Answer the user's question directly for their path and niche.
- Keep replies short: usually 3-8 sentences or a short list. Use plain text with simple "- " bullets, no headings, no markdown tables.
- Give one clear next action they can do today.
- Search the web only when the answer depends on current facts (platform rules, current rates, tool pricing); otherwise answer from what you know.
- Never invent statistics or sources.`

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403)
  const client = getClient()
  if (!client) return json({ error: 'ai_not_configured' }, 503)

  const body = (await req.json().catch(() => null)) as { user?: unknown; playbookSummary?: unknown; messages?: unknown } | null
  const user = readUser(body?.user)
  const raw = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : []
  const messages: Anthropic.Beta.BetaMessageParam[] = raw
    .map((m: { from?: unknown; text?: unknown }) => ({
      role: m.from === 'coach' ? ('assistant' as const) : ('user' as const),
      content: clip(m.text, 2000),
    }))
    .filter((m) => m.content.trim())
  // The API needs the conversation to start and end on a user turn.
  while (messages.length && messages[0].role !== 'user') messages.shift()
  if (!user || !messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400)

  const context = [describeUser(user), body?.playbookSummary ? `\nTheir niche playbook summary: ${clip(body.playbookSummary, 600)}` : ''].join('')

  try {
    let response = await client.beta.messages.create({
      model: MODEL,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: METHODOLOGY, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `${COACH_STYLE}\n\nAbout this user:\n${context}` },
      ],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
      messages,
    })
    // Server-side web search can pause a long turn; resume it with the partial answer.
    for (let i = 0; i < 2 && response.stop_reason === 'pause_turn'; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: [
          { type: 'text', text: METHODOLOGY, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `${COACH_STYLE}\n\nAbout this user:\n${context}` },
        ],
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
        messages: [...messages, { role: 'assistant', content: response.content }],
      })
    }
    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422)
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    if (!text) return json({ error: 'empty' }, 502)
    return json({ reply: text })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429)
    if (error instanceof Anthropic.APIError) return json({ error: 'upstream', status: error.status }, 502)
    throw error
  }
}
