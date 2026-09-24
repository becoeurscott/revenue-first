import { Link } from 'react-router-dom'
import { Check, ChevronRight, Lock, Play } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { DayPlan } from '@/data/types'
import { cn } from '@/lib/cn'
import type { DayStatus } from '@/store/selectors'

const node: Record<DayStatus, string> = {
  completed: 'bg-success/15 text-success border-success/30',
  today: 'bg-brand-gradient text-white border-transparent shadow-glow-sm',
  'in-progress': 'bg-brand-gradient text-white border-transparent shadow-glow-sm',
  locked: 'bg-surface-2 text-faint border-line',
}

export function TimelineDay({ plan, status, lessonTitle, last }: { plan: DayPlan; status: DayStatus; lessonTitle?: string; last?: boolean }) {
  const active = status === 'today' || status === 'in-progress'
  return (
    <li className="relative flex gap-4" id={active ? 'today' : undefined}>
      {!last && <span aria-hidden className={cn('absolute top-11 bottom-0 left-[21px] w-0.5 rounded-full', status === 'completed' ? 'bg-success/30' : 'bg-line')} />}
      <span className={cn('tabular relative z-[1] mt-1 flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold', node[status])}>
        {status === 'completed' ? <Check className="size-5" aria-hidden /> : status === 'locked' ? <Lock className="size-4" aria-hidden /> : plan.day}
        {active && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand-500/30 [animation-duration:2.4s]" />}
      </span>
      <Link
        to={`/plan/day/${plan.day}`}
        aria-label={`Day ${plan.day}: ${plan.theme}, ${status}`}
        className={cn(
          'mb-3 min-w-0 flex-1 rounded-xl border p-4 transition-all duration-200 active:scale-[0.99]',
          active ? 'border-brand-500/40 bg-brand-500/[0.08] shadow-glow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
          status === 'locked' && 'opacity-60',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-wider text-faint uppercase">Day {plan.day}</span>
          {active && <Badge tone="brand">{status === 'in-progress' ? 'In progress' : "Today's mission"}</Badge>}
          {status === 'completed' && <Badge tone="success">Completed</Badge>}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">{plan.theme}</h3>
          <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
        </div>
        {(active || status === 'completed') && lessonTitle && (
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
            <Play className="size-3 shrink-0 fill-current" aria-hidden /> <span className="truncate">{lessonTitle}</span>
          </p>
        )}
        <p className="tabular mt-1 text-xs text-faint">{plan.minutes} min · {plan.difficulty} · +{plan.xp} XP</p>
      </Link>
    </li>
  )
}
