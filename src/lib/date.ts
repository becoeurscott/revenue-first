/** Date helpers. Mock data uses relative dates so the demo always feels current. */

export function daysAgo(n: number, hour = 9, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function daysFromNow(n: number, hour = 9): string {
  return daysAgo(-n, hour)
}

export function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Local calendar key, e.g. 2026-09-18 */
export function dayKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${day}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) {
    const days = Math.ceil(-diff / 86_400_000)
    return days <= 1 ? 'Tomorrow' : `In ${days} days`
  }
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso)
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
