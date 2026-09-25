import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const seen = new Set<string>()

/** Simulates a short fetch so skeletons get a moment on screen — only on the first visit to a screen per session. */
export function useFakeLoad(ms = 250, key: unknown = null): boolean {
  const { pathname } = useLocation()
  const id = `${pathname}|${String(key)}`
  const [doneId, setDoneId] = useState<string | null>(null)
  useEffect(() => {
    if (seen.has(id)) return
    const t = window.setTimeout(() => {
      seen.add(id)
      setDoneId(id)
    }, Math.min(ms, 250))
    return () => window.clearTimeout(t)
  }, [ms, id])
  return !seen.has(id) && doneId !== id
}
