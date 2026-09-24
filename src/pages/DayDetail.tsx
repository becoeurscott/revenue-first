import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Check, Clock, Lock, Minus, Tag, Target, Zap } from 'lucide-react'
import { LessonCard } from '@/components/domain/LessonCard'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getLesson } from '@/data/lessons'
import { cn } from '@/lib/cn'
import { useDayStatus, useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

export default function DayDetail() {
  const navigate = useNavigate()
  const { day } = useParams()
  const { plan, progress, path } = useProgram()
  const statusOf = useDayStatus()
  const tasks = useApp((s) => s.tasks)
  const d = plan.find((p) => p.day === Number(day))

  if (!d) {
    return (
      <Page title="Day not found" back="/plan">
        <EmptyState mood="sad" title="That day isn't in your plan" description="Your program runs from Day 1 to Day 30." action={<Button onClick={() => navigate('/plan')}>Back to Plan</Button>} />
      </Page>
    )
  }

  const status = statusOf(d.day)
  const locked = status === 'locked'
  const lesson = getLesson(d.lessonId)
  const doneCount = d.tasks.filter((t) => tasks[t.id]).length

  return (
    <Page title={`Day ${d.day}`} back="/plan">
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Week {d.week} · {path.weeks[d.week - 1]?.title}</Badge>
            {status === 'completed' && <Badge tone="success" icon={<Check className="size-3" aria-hidden />}>Completed</Badge>}
            {status === 'in-progress' && <Badge tone="warning">In progress</Badge>}
            {locked && <Badge icon={<Lock className="size-3" aria-hidden />}>Locked</Badge>}
          </div>
          <p className="mt-4 text-xs font-bold tracking-wider text-faint uppercase">Day {d.day}</p>
          <h2 className="mt-1 text-[30px] leading-tight font-extrabold tracking-tight">{d.theme}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">{d.missionTitle}</p>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { icon: Clock, label: 'Duration', value: `${d.minutes} min` },
              { icon: Tag, label: 'Difficulty', value: d.difficulty },
              { icon: Zap, label: 'Reward', value: `+${d.xp} XP` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-line bg-surface p-3">
                <Icon className="size-4 text-brand-300" aria-hidden />
                <p className="mt-2 text-sm font-bold">{value}</p>
                <p className="text-xs text-faint">{label}</p>
              </div>
            ))}
          </div>

          <Card variant="hero" className="mt-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-brand-300 uppercase"><Target className="size-4" aria-hidden /> Today's goal</div>
            <p className="mt-1.5 text-lg font-bold">{d.goal}</p>
          </Card>

          <section className="mt-8">
            <SectionHeader title={`Checklist · ${doneCount}/${d.tasks.length}`} />
            <Card pad={false} className="divide-y divide-line">
              {d.tasks.map((t) => {
                const state = tasks[t.id]
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md border', state === 'done' ? 'border-transparent bg-success text-black' : state === 'skipped' ? 'border-line-strong bg-surface-3 text-faint' : 'border-line-strong')}>
                      {state === 'done' && <Check className="size-4" aria-hidden />}
                      {state === 'skipped' && <Minus className="size-4" aria-hidden />}
                    </span>
                    <span className={cn('text-[15px]', state ? 'text-muted line-through decoration-line-strong' : 'text-ink-soft')}>{t.title}</span>
                    <span className="sr-only">{state ?? 'not started'}</span>
                  </div>
                )
              })}
            </Card>
          </section>
        </div>

        <div className="lg:col-span-2">
          {lesson && (
            <section className="mt-8 lg:mt-0">
              <SectionHeader title="Today's lesson" />
              <LessonCard lesson={lesson} layout="tile" locked={status !== 'completed'} />
              {status !== 'completed' && <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-faint"><Lock className="size-3" aria-hidden /> Unlocks when you complete this mission</p>}
            </section>
          )}

          <div className="sticky bottom-24 mt-8 lg:bottom-6">
            {locked ? (
              <Card variant="locked" className="flex items-center gap-3 !opacity-100">
                <Lock className="size-5 shrink-0 text-faint" aria-hidden />
                <p className="flex-1 text-sm text-muted">Complete Day {progress.currentDay} to move forward. One day at a time.</p>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/plan/day/${progress.currentDay}`)}>Go to Day {progress.currentDay}</Button>
              </Card>
            ) : (
              <Button size="lg" full className="shadow-glow" variant={status === 'completed' ? 'secondary' : 'primary'} onClick={() => navigate(`/mission/${d.day}`)} iconRight={<ArrowRight className="size-5" aria-hidden />}>
                {status === 'completed' ? 'Review Mission' : status === 'in-progress' ? 'Continue Mission' : 'Start Mission'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
