import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock, Eye, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { plans } from '@/data/missions'
import type { DayPlan, PathInfo } from '@/data/types'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/useApp'

function DayRow({ day, state, linked }: { day: DayPlan; state: 'completed' | 'current' | 'locked' | 'preview'; linked: boolean }) {
  const inner = (
    <>
      <span
        className={cn(
          'tabular flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
          state === 'completed' && 'bg-success/12 text-success',
          state === 'current' && 'bg-brand-gradient text-white shadow-glow-sm',
          (state === 'locked' || state === 'preview') && 'bg-surface-3 text-muted',
        )}
      >
        {day.day}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{day.theme}</span>
        <span className="tabular flex items-center gap-1 text-xs text-faint">
          <Clock className="size-3" aria-hidden /> {day.minutes} min
          {state === 'current' && <span className="ml-1 font-semibold text-brand-300">· Today</span>}
        </span>
      </span>
      {state === 'completed' && <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-label="Completed" />}
      {state === 'locked' && <Lock className="size-4 shrink-0 text-faint" aria-label="Locked" />}
      {state === 'current' && <ChevronRight className="size-4 shrink-0 text-brand-300" aria-hidden />}
    </>
  )
  const cls = 'flex min-h-14 items-center gap-3 px-4 py-2'
  return linked ? (
    <Link to={`/plan/day/${day.day}`} className={cn(cls, 'transition-colors hover:bg-surface-2')}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

/** The 4 weeks of a path with their days. Days are links only on the active path. */
export function PathPlanTab({ path, active }: { path: PathInfo; active: boolean }) {
  const progress = useApp((s) => s.progress[path.id])
  const plan = plans[path.id]
  return (
    <div className="space-y-5">
      {!active && (
        <p className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
          <Eye className="size-4 shrink-0 text-brand-300" aria-hidden />
          Preview only. Switch to this path to open its daily missions.
        </p>
      )}
      <div className="stagger grid gap-5 lg:grid-cols-2">
        {path.weeks.map((w) => {
          const days = plan.filter((d) => d.week === w.week)
          const done = days.filter((d) => progress.completedDays.includes(d.day)).length
          return (
            <Card key={w.week} pad={false} className="overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wider text-brand-300 uppercase">Week {w.week}</p>
                  {active && <Badge tone={done === days.length && days.length > 0 ? 'success' : 'neutral'} className="tabular">{done}/{days.length} days</Badge>}
                </div>
                <h3 className="mt-1 text-[17px] font-bold tracking-tight">{w.title}</h3>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {w.focus.map((f) => (
                    <li key={f} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="divide-y divide-line border-t border-line">
                {days.map((d) => {
                  const state = !active ? 'preview' : progress.completedDays.includes(d.day) ? 'completed' : d.day === progress.currentDay ? 'current' : d.day > progress.currentDay ? 'locked' : 'preview'
                  return <DayRow key={d.day} day={d} state={state} linked={active} />
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
