import { useEffect, useState } from 'react'
import { Mascot } from './Mascot'

const LINES = ['Warming up the neurons…', 'Fetching your plan…', 'Counting your wins…', 'Almost there…']

/** Full-area loading state: Penny thinks while an orbit spins around her. */
export function MascotLoader({ label, full = true }: { label?: string; full?: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={full ? 'flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg p-8' : 'flex flex-col items-center justify-center gap-6 py-16'} role="status" aria-live="polite">
      <div className="relative flex size-44 items-center justify-center">
        <div aria-hidden className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-brand-500/40">
          <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-brand-400 shadow-glow-sm" />
          <span className="absolute top-1/2 -right-1 size-2 rounded-full bg-accent" />
        </div>
        <Mascot mood="thinking" size={120} interactive={false} />
      </div>
      <p key={i} className="animate-fade-in text-sm font-medium text-muted">{label ?? LINES[i]}</p>
    </div>
  )
}
