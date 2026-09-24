import { useEffect, useState } from 'react'
import { Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'

/** Fictitious sample results shown when someone previews the screen before finishing. */
export const SHOWCASE_RESULTS = { missions: 30, lessons: 28, contacted: 87, replies: 12, clients: 3, revenue: 850 }

/** Fictitious follow-up program. */
export const ADVANCED_PROGRAM = {
  name: 'Advanced: Scale to $2K/month',
  tagline: 'A second 30-day program for people who already have their first client.',
  weeks: [
    { title: 'Productize your offer', body: 'Turn one-off jobs into two fixed packages with clear scope and pricing.' },
    { title: 'Build a referral engine', body: 'Testimonials, case studies and a simple ask that brings warm leads every week.' },
    { title: 'Retainers, not projects', body: 'Convert your best clients to monthly plans so revenue stops resetting to zero.' },
    { title: 'Systems and leverage', body: 'Templates, batching and your first subcontractor so you can take on more work.' },
  ],
}

/** Counts from 0 to `target` on mount. Jumps straight to the target with prefers-reduced-motion. */
export function useCountUp(target: number, duration = 1400): number {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])
  return reduced ? target : value
}

export function CountStat({ emoji, value, label, prefix = '', accent }: { emoji: string; value: number; label: string; prefix?: string; accent?: boolean }) {
  const v = useCountUp(value)
  return (
    <div className="rounded-xl border border-line bg-surface/80 p-4 text-left backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-sm bg-surface-3 text-lg" aria-hidden>{emoji}</span>
      <p className={accent ? 'tabular text-brand-gradient mt-2 text-3xl font-extrabold tracking-tight' : 'tabular mt-2 text-3xl font-extrabold tracking-tight'} aria-label={`${prefix}${value.toLocaleString('en-US')} ${label}`}>
        {prefix}{v.toLocaleString('en-US')}
      </p>
      <p className="mt-0.5 text-[13px] text-muted">{label}</p>
    </div>
  )
}

export function AdvancedProgramSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ADVANCED_PROGRAM.name}
      description={ADVANCED_PROGRAM.tagline}
      footer={
        <>
          <Button
            full
            size="lg"
            icon={<Rocket className="size-4.5" aria-hidden />}
            onClick={() => {
              toast.success('You’re on the waitlist. We’ll notify you first.')
              onClose()
            }}
          >
            Join the waitlist
          </Button>
          <p className="mt-2 text-center text-xs text-faint">Free to join. Opens to 30-day finishers first.</p>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="brand">30 days</Badge>
        <Badge tone="warning">Intermediate</Badge>
        <Badge tone="neutral">Waitlist open</Badge>
      </div>
      <ol className="space-y-3">
        {ADVANCED_PROGRAM.weeks.map((w, i) => (
          <li key={w.title} className="flex gap-3 rounded-lg border border-line bg-surface p-3.5">
            <span className="tabular bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-faint uppercase">Week {i + 1}</p>
              <p className="text-[15px] font-semibold">{w.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{w.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
