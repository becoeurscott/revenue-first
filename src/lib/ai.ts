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

function userContext(s: AppState) {
  return {
    path: s.pathId,
    niche: s.answers.niche ?? '',
    name: s.user.name.split(' ')[0],
    experience: s.user.experience,
    skills: s.user.skills,
    time: s.user.time,
    budget: s.user.budget,
    goal: s.user.goal,
    blocker: s.answers.blocker,
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
  const data = await post<{ playbook?: Playbook }>('/api/playbook', { user: userContext(s), plan }, 180_000)
  if (!data.playbook) throw new AiRequestError('failed')
  return data.playbook
}

export async function askCoach(s: AppState, messages: ChatMessage[]): Promise<string> {
  const data = await post<{ reply?: string }>(
    '/api/coach',
    { user: userContext(s), playbookSummary: s.playbook?.summary, messages: messages.map((m) => ({ from: m.from, text: m.text })) },
    90_000,
  )
  if (!data.reply) throw new AiRequestError('failed')
  return data.reply
}
