import { z } from 'zod'

/**
 * Claude through OpenRouter (OpenAI-compatible chat completions).
 * - Prompt caching: system blocks marked `cache` are sent with Anthropic `cache_control`.
 * - Structured output: `schema` becomes a strict `json_schema` response format and is validated with zod.
 * - Web search: OpenRouter's `web` plugin, billed per search.
 * - Fallback: a cheaper Claude model is tried when the first is busy or down.
 *
 * Env: OPENROUTER_API_KEY, optional OPENROUTER_MODEL_SMART / OPENROUTER_MODEL_FAST.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const MODELS = {
  /** One-off, high-value writing: the personal program and the niche playbook. */
  smart: process.env.OPENROUTER_MODEL_SMART ?? 'anthropic/claude-opus-5.5',
  /** Frequent, short answers: the coach and niche profiles. */
  fast: process.env.OPENROUTER_MODEL_FAST ?? 'anthropic/claude-sonnet-5.5',
}

const FALLBACKS: Record<string, string> = {
  'anthropic/claude-opus-5.5': 'anthropic/claude-sonnet-5.5',
  'anthropic/claude-sonnet-5.5': 'anthropic/claude-haiku-5.5',
}

export const llmConfigured = () => !!process.env.OPENROUTER_API_KEY

/** Drops JSON Schema keywords Claude's structured output rejects ($schema, numeric bounds zod adds to integers). */
function cleanSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(cleanSchema)
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === '$schema' || k === 'minimum' || k === 'maximum' || k === 'exclusiveMinimum' || k === 'exclusiveMaximum') continue
    out[k] = cleanSchema(v)
  }
  return out
}

export class LlmError extends Error {
  constructor(
    readonly kind: 'not_configured' | 'busy' | 'upstream' | 'refused' | 'bad_output',
    readonly status?: number,
  ) {
    super(kind)
  }
}

/** Maps a failed call to the JSON error every endpoint returns. */
export function llmErrorResponse(error: LlmError): { body: { error: string; status?: number }; status: number } {
  switch (error.kind) {
    case 'not_configured': return { body: { error: 'ai_not_configured' }, status: 503 }
    case 'busy': return { body: { error: 'busy' }, status: 429 }
    case 'refused': return { body: { error: 'refused' }, status: 422 }
    case 'bad_output': return { body: { error: 'bad_output' }, status: 502 }
    default: return { body: { error: 'upstream', status: error.status }, status: 502 }
  }
}

export interface LlmResult<T> {
  text: string
  parsed: T | null
  /** Same shape `trackGeneration` reads. */
  model: string
  stop_reason: string | null
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number }
}

interface Options<T> {
  model: string
  system: { text: string; cache?: boolean }[]
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens: number
  schema?: { name: string; zod: z.ZodType<T> }
  /** Max web results per request; omit for no search. */
  webSearch?: number
  timeoutMs?: number
}

export async function complete<T = unknown>(o: Options<T>): Promise<LlmResult<T>> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new LlmError('not_configured')

  const body: Record<string, unknown> = {
    models: [o.model, FALLBACKS[o.model]].filter(Boolean),
    max_tokens: o.maxTokens,
    messages: [
      {
        role: 'system',
        content: o.system.map((s) => ({ type: 'text', text: s.text, ...(s.cache ? { cache_control: { type: 'ephemeral' } } : {}) })),
      },
      ...o.messages,
    ],
  }
  if (o.schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: o.schema.name, strict: true, schema: cleanSchema(z.toJSONSchema(o.schema.zod)) } }
  }
  if (o.webSearch) body.plugins = [{ id: 'web', max_results: o.webSearch }]

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://revenue-first.vercel.app',
        'X-Title': 'Vaulten',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(o.timeoutMs ?? 170_000),
    })
  } catch {
    throw new LlmError('upstream')
  }
  if (res.status === 429) throw new LlmError('busy')
  if (res.status === 401) throw new LlmError('not_configured')
  if (!res.ok) throw new LlmError('upstream', res.status)

  const data = (await res.json().catch(() => null)) as {
    model?: string
    choices?: { finish_reason?: string | null; native_finish_reason?: string | null; message?: { content?: string | null; refusal?: string | null } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
    error?: { code?: number }
  } | null
  if (!data || data.error) throw new LlmError('upstream', data?.error?.code)
  const choice = data.choices?.[0]
  const stop = choice?.native_finish_reason ?? choice?.finish_reason ?? null
  if (choice?.message?.refusal || stop === 'refusal' || choice?.finish_reason === 'content_filter') throw new LlmError('refused')

  const text = (choice?.message?.content ?? '').trim()
  let parsed: T | null = null
  if (o.schema) {
    const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    try {
      const result = o.schema.zod.safeParse(JSON.parse(raw))
      parsed = result.success ? result.data : null
    } catch {
      parsed = null
    }
    if (!parsed) throw new LlmError('bad_output')
  }

  return {
    text,
    parsed,
    model: data.model ?? o.model,
    stop_reason: stop,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      cache_read_input_tokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    },
  }
}
