import { cn } from '@/lib/cn'
import { dayKey } from '@/lib/date'

/** Calendar heatmap of the last `weeks` weeks. Active days glow. */
export function Heatmap({ activeDays, weeks = 5 }: { activeDays: string[]; weeks?: number }) {
  const active = new Set(activeDays)
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // finish the current week
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (weeks * 7 - 1 - i))
    return d
  })
  const todayKey = dayKey(today)
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-faint" aria-hidden>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`${activeDays.length} active days in the last ${weeks} weeks`}>
        {cells.map((d) => {
          const key = dayKey(d)
          const on = active.has(key)
          const future = d > today && !on
          return (
            <div
              key={key}
              title={d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              className={cn(
                'tabular flex aspect-square items-center justify-center rounded-sm text-xs font-semibold transition-colors',
                on ? 'bg-brand-gradient text-white shadow-glow-sm' : 'bg-surface-2 text-faint',
                future && 'opacity-35',
                key === todayKey && !on && 'ring-2 ring-brand-500/60 ring-inset text-ink',
              )}
            >
              {d.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
