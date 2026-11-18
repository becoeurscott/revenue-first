/**
 * Who is calling, which plan they are on, and how much AI they have left.
 *
 * Callers authenticate with their Vaulten access token (`Authorization: Bearer …`), checked against the
 * Vaulten API. RevenueCat is the source of truth for the plan; the app identifies purchasers by their
 * Vaulten account id. Coach usage is counted in Upstash Redis (REST API, no SDK).
 *
 * Env: REVENUECAT_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, optional VAULTEN_API_URL.
 */

const VAULTEN_API_URL = process.env.VAULTEN_API_URL ?? 'https://api.vaulten-staging.jerseycollection.shop/api/v1/'

export type Tier = 'free' | 'premium' | 'ultimate' | 'trial'

/** Premium unlocks the program and tools; Ultimate adds 300 AI Coach messages a month. */
const ENTITLEMENTS = { premium: 'vaulten_pro', ultimate: 'vaulten_ultimate' } as const

/** AI Coach messages per plan. Free is a lifetime taste; the paid plans reset every calendar month (UTC). */
export const COACH_LIMITS: Record<Tier, { limit: number; period: 'lifetime' | 'month' }> = {
  /** There is no free plan in the app any more; kept at 0 so an unpaid account can never spend AI. */
  free: { limit: 0, period: 'lifetime' },
  premium: { limit: 10, period: 'month' },
  ultimate: { limit: 300, period: 'month' },
  /** Any free trial (Premium or Ultimate): enough to judge the coach, not enough to run up AI costs for free. */
  trial: { limit: 20, period: 'month' },
}

/** The Vaulten account behind the bearer token, or null. */
export async function accountId(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const res = await fetch(new URL('users/me', VAULTEN_API_URL), { headers: { authorization: auth, accept: 'application/json' } })
    if (!res.ok) return null
    const body = (await res.json()) as { data?: { id?: unknown } }
    return typeof body.data?.id === 'string' && body.data.id ? body.data.id : null
  } catch {
    return null
  }
}

/** The caller's plan according to RevenueCat. Any lookup failure counts as free, never as paid. */
export async function tier(appUserId: string): Promise<Tier> {
  const key = process.env.REVENUECAT_SECRET_KEY
  if (!key) return 'free'
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
    })
    if (!res.ok) return 'free'
    const body = (await res.json()) as {
      subscriber?: {
        entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }>
        subscriptions?: Record<string, { period_type?: string }>
      }
    }
    const active = (id: string) => {
      const e = body.subscriber?.entitlements?.[id]
      return !!e && (e.expires_date == null || Date.parse(e.expires_date) > Date.now()) ? e : null
    }
    const inTrial = (e: { product_identifier?: string } | null) =>
      !!e?.product_identifier && body.subscriber?.subscriptions?.[e.product_identifier]?.period_type === 'trial'
    const ultimate = active(ENTITLEMENTS.ultimate)
    if (ultimate) return inTrial(ultimate) ? 'trial' : 'ultimate'
    const premium = active(ENTITLEMENTS.premium)
    if (premium) return inTrial(premium) ? 'trial' : 'premium'
    return 'free'
  } catch {
    return 'free'
  }
}

export interface CoachUsage {
  tier: Tier
  used: number
  limit: number
  period: 'lifetime' | 'month'
  /** ISO date the monthly allowance resets; null for the free lifetime allowance. */
  resetsAt: string | null
}

function usageKey(userId: string, t: Tier, now = new Date()): { key: string; resetsAt: Date | null } {
  if (COACH_LIMITS[t].period === 'lifetime') return { key: `coach:${userId}:lifetime`, resetsAt: null }
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return { key: `coach:${userId}:${month}`, resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) }
}

/** Runs Redis commands through Upstash's REST pipeline. Null when the store isn't configured or fails. */
export async function redis(commands: (string | number)[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
    })
    if (!res.ok) return null
    const out = (await res.json()) as { result?: unknown; error?: string }[]
    return out.some((r) => r.error) ? null : out.map((r) => r.result)
  } catch {
    return null
  }
}

function usage(t: Tier, used: number, resetsAt: Date | null): CoachUsage {
  return { tier: t, used, limit: COACH_LIMITS[t].limit, period: COACH_LIMITS[t].period, resetsAt: resetsAt?.toISOString() ?? null }
}

/** Current usage without spending anything. Null when the usage store is unavailable. */
export async function coachUsage(userId: string, t: Tier): Promise<CoachUsage | null> {
  const { key, resetsAt } = usageKey(userId, t)
  const out = await redis([['GET', key]])
  if (!out) return null
  return usage(t, Number(out[0] ?? 0) || 0, resetsAt)
}

/**
 * Reserves one coach message. Returns the usage after reserving, `limit` when the allowance is spent,
 * or null when the usage store is unavailable (callers must then refuse: unmetered AI is never served).
 */
export async function reserveCoachMessage(userId: string, t: Tier): Promise<{ ok: true; usage: CoachUsage } | { ok: false; usage: CoachUsage } | null> {
  const { key, resetsAt } = usageKey(userId, t)
  // Counters for monthly periods expire a few days after the month ends.
  const ttl = resetsAt ? Math.ceil((resetsAt.getTime() - Date.now()) / 1000) + 5 * 86400 : null
  const out = await redis(ttl ? [['INCR', key], ['EXPIRE', key, ttl]] : [['INCR', key]])
  if (!out) return null
  const used = Number(out[0]) || 0
  if (used > COACH_LIMITS[t].limit) {
    await redis([['DECR', key]])
    return { ok: false, usage: usage(t, COACH_LIMITS[t].limit, resetsAt) }
  }
  return { ok: true, usage: usage(t, used, resetsAt) }
}

/** Gives a reserved message back when the AI call failed, so users only pay for answers they got. */
export async function refundCoachMessage(userId: string, t: Tier): Promise<void> {
  await redis([['DECR', usageKey(userId, t).key]])
}
