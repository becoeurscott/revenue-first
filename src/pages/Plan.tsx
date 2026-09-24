import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair } from 'lucide-react'
import { TimelineDay } from '@/components/domain/Timeline'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { getLesson } from '@/data/lessons'
import { useDayStatus, useProgram } from '@/store/selectors'

export default function Plan() {
  const navigate = useNavigate()
  const { plan, path, progress, totalDays, finished } = useProgram()
  const statusOf = useDayStatus()
  const done = progress.completedDays.length

  const toToday = (smooth: boolean) => document.getElementById('today')?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
  useEffect(() => {
    const t = setTimeout(() => toToday(false), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <Page
      large
      title="Your 30-Day Plan"
      subtitle={`${path.emoji} ${path.name}`}
      actions={<Button size="sm" variant="secondary" onClick={() => toToday(true)} icon={<Crosshair className="size-4" aria-hidden />}>Today</Button>}
    >
      <Card className="mb-6">
        <div className="flex items-end justify-between">
          <p className="tabular text-2xl font-extrabold tracking-tight">Day {progress.currentDay}<span className="text-base font-semibold text-faint"> / {totalDays}</span></p>
          <p className="tabular text-[13px] text-muted">{done} completed · {totalDays - done} to go</p>
        </div>
        <ProgressBar className="mt-3" value={done / totalDays} label="Plan completion" />
        {finished && <Button full className="mt-4" onClick={() => navigate('/30-day-complete')}>View My 30-Day Results</Button>}
      </Card>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
        {path.weeks.map((week) => {
          const days = plan.filter((d) => d.week === week.week)
          const weekDone = days.filter((d) => progress.completedDays.includes(d.day)).length
          return (
            <section key={week.week} className="mb-6" aria-labelledby={`week-${week.week}`}>
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 id={`week-${week.week}`} className="text-[17px] font-bold tracking-tight">Week {week.week} · {week.title}</h2>
                <span className="tabular text-xs font-semibold text-faint">{weekDone}/{days.length}</span>
              </div>
              <ol>
                {days.map((d, i) => (
                  <TimelineDay key={d.day} plan={d} status={statusOf(d.day)} lessonTitle={getLesson(d.lessonId)?.title} last={i === days.length - 1} />
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </Page>
  )
}
