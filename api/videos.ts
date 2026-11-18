import { accountId, redis } from './_lib/access.js'
import { clip, json } from './_lib/shared.js'

/**
 * YouTube videos for a lesson: GET /api/videos?q=<topic + niche>&lang=en
 *
 * Searches the YouTube Data API (search.list costs 100 of the 10,000 daily quota units, so results are cached in
 * Upstash for 7 days and each account is limited to 40 new searches a day). Returns embeddable, non-Short videos
 * with safe search on.
 *
 * Env: YOUTUBE_API_KEY (Google Cloud, YouTube Data API v3 enabled), plus the Upstash vars from access.ts.
 */

export interface Video {
  id: string
  title: string
  channel: string
  thumbnail: string
  durationSeconds: number
  views: number | null
  publishedAt: string
}

const CACHE_SECONDS = 7 * 24 * 60 * 60
const DAILY_SEARCHES_PER_ACCOUNT = 40
const YT = 'https://www.googleapis.com/youtube/v3'

export async function GET(req: Request): Promise<Response> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return json({ error: 'videos_not_configured' }, 503)
  const userId = await accountId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const params = new URL(req.url).searchParams
  const q = clip(params.get('q'), 120).replace(/\s+/g, ' ').trim()
  const lang = /^[a-z]{2}$/.test(params.get('lang') ?? '') ? params.get('lang')! : 'en'
  if (q.length < 3) return json({ error: 'bad_request' }, 400)

  const cacheKey = `yt:v1:${lang}:${q.toLowerCase()}`
  const cached = await redis([['GET', cacheKey]])
  if (typeof cached?.[0] === 'string') return json({ videos: JSON.parse(cached[0]) as Video[], cached: true })

  // Only new searches spend quota, so only they count against the account's daily allowance.
  const day = new Date().toISOString().slice(0, 10)
  const counted = await redis([['INCR', `yt:searches:${userId}:${day}`], ['EXPIRE', `yt:searches:${userId}:${day}`, 86_400]])
  if (typeof counted?.[0] === 'number' && counted[0] > DAILY_SEARCHES_PER_ACCOUNT) return json({ error: 'rate_limited' }, 429)

  try {
    const search = new URL(`${YT}/search`)
    for (const [k, v] of Object.entries({
      part: 'snippet', type: 'video', maxResults: '12', q, relevanceLanguage: lang, safeSearch: 'strict',
      videoEmbeddable: 'true', videoSyndicated: 'true', key,
    })) search.searchParams.set(k, v)
    const found = await fetch(search)
    if (!found.ok) return json({ error: found.status === 403 ? 'quota_exceeded' : 'youtube_error' }, 502)
    const ids = ((await found.json()) as { items?: { id?: { videoId?: string } }[] }).items?.map((i) => i.id?.videoId).filter(Boolean) ?? []
    if (ids.length === 0) return json({ videos: [] })

    // videos.list (1 unit) adds duration and views, so Shorts and very short clips can be left out.
    const details = new URL(`${YT}/videos`)
    for (const [k, v] of Object.entries({ part: 'snippet,contentDetails,statistics', id: ids.join(','), key })) details.searchParams.set(k, v)
    const res = await fetch(details)
    if (!res.ok) return json({ error: 'youtube_error' }, 502)
    const items = ((await res.json()) as { items?: YtVideo[] }).items ?? []

    const videos: Video[] = items
      .map((v) => ({
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        durationSeconds: seconds(v.contentDetails.duration),
        views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
        publishedAt: v.snippet.publishedAt,
      }))
      .filter((v) => v.durationSeconds >= 120 && v.durationSeconds <= 45 * 60)
      .slice(0, 6)

    await redis([['SET', cacheKey, JSON.stringify(videos), 'EX', CACHE_SECONDS]])
    return json({ videos })
  } catch {
    return json({ error: 'youtube_error' }, 502)
  }
}

interface YtVideo {
  id: string
  snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails?: Record<string, { url: string }> }
  contentDetails: { duration: string }
  statistics?: { viewCount?: string }
}

/** ISO 8601 duration (PT1H2M3S) to seconds. */
function seconds(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!m) return 0
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  return d * 86_400 + h * 3_600 + min * 60 + s
}
