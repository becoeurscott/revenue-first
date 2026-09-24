import { useEffect, useState } from 'react'

/** Simulates a short fetch so skeletons get a moment on screen. Returns true while "loading". */
export function useFakeLoad(ms = 450, key: unknown = null): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const id = window.setTimeout(() => setLoading(false), ms)
    return () => window.clearTimeout(id)
  }, [ms, key])
  return loading
}
