import { plans } from '@/data/missions'
import type { ChatMessage, Playbook } from '@/data/types'
import type { AppState } from '@/store/useApp'

/** `not_configured` means the server has no Claude key yet — callers fall back to built-in content. */
export type AiError = 'not_configured' | 'offline' | 'busy' | 'failed'

export class AiRequestError extends Error {
  readonly kind: AiError
  constructor(kind: AiError) {
    super(kind)
    this.kind = kind
  }
}

function observabilityContext(s: AppState, sessionId: string) {
  return {
    distinctId: `profile:${s.user.joined}`,
    sessionId,
    traceId: crypto.randomUUID(),
  }
}

/** The web prototype only runs service journeys: each path maps to exactly one journey. */
const JOURNEY_BY_PATH = { clipping: 'youtube_services', gbp: 'freelance_services' } as const

function journeyContext(s: AppState) {
  const day = s.progress[s.pathId]?.currentDay ?? 1
  const mine = s.prospects.filter((p) => p.path === s.pathId)
  return {
    journeyId: JOURNEY_BY_PATH[s.pathId],
    journeyVersion: 1,
    niche: s.answers.niche ?? '',
    startingStage: s.user.experience,
    constraints: { weeklyTime: s.user.time, budget: s.user.budget, equipment: [], skills: s.user.skills, location: '' },
    name: s.user.name.split(' ')[0],
    goal: s.user.goal,
    currentDay: day,
    currentMission: plans[s.pathId].find((d) => d.day === day)?.missionTitle ?? '',
    metrics: {
      prospects: mine.length,
      contacted: mine.filter((p) => p.status !== 'New').length,
      revenue: s.deals.filter((d) => d.path === s.pathId && d.status === 'Collected').reduce((sum, d) => sum + d.amount, 0),
    },
  }
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new AiRequestError('offline')
  }
  // Static hosting without the API (e.g. `vite dev`) answers 404/405 or with HTML.
  if (res.status === 503 || res.status === 404 || res.status === 405) throw new AiRequestError('not_configured')
  if (res.status === 429) throw new AiRequestError('busy')
  if (!res.ok) throw new AiRequestError('failed')
  try {
    return (await res.json()) as T
  } catch {
    throw new AiRequestError('not_configured')
  }
}

export async function generatePlaybook(s: AppState): Promise<Playbook> {
  const plan = plans[s.pathId].map((d) => ({ day: d.day, theme: d.theme, mission: d.missionTitle }))
  const data = await post<{ playbook?: Playbook }>(
    '/api/playbook',
    { context: journeyContext(s), plan, ai: observabilityContext(s, `playbook:${crypto.randomUUID()}`) },
    180_000,
  )
  if (!data.playbook) throw new AiRequestError('failed')
  return data.playbook
}

export async function askCoach(s: AppState, conversationId: string, messages: ChatMessage[]): Promise<string> {
  const data = await post<{ reply?: string }>(
    '/api/coach',
    {
      context: journeyContext(s),
      playbookSummary: s.playbook?.summary,
      messages: messages.map((m) => ({ from: m.from, text: m.text })),
      ai: observabilityContext(s, `coach:${conversationId}`),
    },
    90_000,
  )
  if (!data.reply) throw new AiRequestError('failed')
  return data.reply
}
