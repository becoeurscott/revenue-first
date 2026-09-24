import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Mascot, type MascotMood } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Heatmap } from '@/components/ui/Heatmap'
import { ProgressBar } from '@/components/ui/Progress'
import { StatCard } from '@/components/ui/StatCard'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const STREAK_GOALS = [3, 7, 14, 30]

function messageFor(streak: number): { mood: MascotMood; title: string; body: string } {
  if (streak === 0) return { mood: 'wink', title: 'Every streak starts at one', body: 'Finish today’s mission and light the fire. It takes about 20 minutes.' }
  if (streak < 3) return { mood: 'happy', title: 'You’ve started. That’s the hard part.', body: 'The first three days decide whether a habit sticks. Show up again tomorrow.' }
  if (streak < 7) return { mood: 'focused', title: 'Momentum is building', body: 'You’re past the point where most people quit. A full week is within reach.' }
  if (streak < 14) return { mood: 'excited', title: 'A full week of showing up', body: 'This is how first clients happen — small, boring, daily action. Keep stacking days.' }
  return { mood: 'love', title: 'You’re in rare company', body: 'Two weeks or more of daily action. At this point the streak is part of who you are.' }
}

export default function Streak() {
  const navigate = useNavigate()
  const streak = useApp((s) => s.streak)
  const longest = useApp((s) => s.longestStreak)
  const activeDays = useApp((s) => s.activeDays)
  const { todayDone, progress } = useProgram()
  const msg = messageFor(streak)
  const goal = STREAK_GOALS.find((g) => g > streak)
  const prevGoal = [...STREAK_GOALS].reverse().find((g) => g <= streak) ?? 0

  return (
    <Page title="Streak" back>
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="flex animate-fade-up flex-col items-center pt-4 pb-2 text-center" aria-label="Current streak">
          <div className="relative flex size-36 items-center justify-center">
            <span className="absolute inset-2 animate-pulse-glow rounded-full bg-warning/30 blur-2xl" aria-hidden />
            <span className="absolute inset-6 rounded-full bg-brand-500/30 blur-xl" aria-hidden />
            <span className="relative animate-float text-[88px] leading-none" role="img" aria-label="Fire">🔥</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Current Streak</p>
          <p className="mt-1 text-6xl leading-none font-extrabold tracking-tight">
            <span className="tabular">{streak}</span> <span className="text-3xl text-muted">{streak === 1 ? 'day' : 'days'}</span>
          </p>
        </section>

        <div className="stagger grid grid-cols-3 gap-3">
          <StatCard value={streak} label="Current streak" />
          <StatCard value={longest} label="Longest streak" />
          <StatCard value={activeDays.length} label="Total active days" />
        </div>

        <Card variant={todayDone ? 'completed' : 'hero'} className="animate-fade-up">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Mascot mood={todayDone ? 'happy' : msg.mood} size={104} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight">{msg.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{msg.body}</p>
              {todayDone ? (
                <p className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-success/12 px-4 text-sm font-semibold text-success">
                  <CheckCircle2 className="size-4.5 shrink-0" aria-hidden /> Today is done. See you tomorrow.
                </p>
              ) : (
                <Button className="mt-4 w-full sm:w-auto" aria-label="Keep it alive — start today’s mission" onClick={() => navigate(`/mission/${progress.currentDay}`)} iconRight={<ArrowRight className="size-4 shrink-0" aria-hidden />}>
                  <span className="hidden min-[420px]:inline">Keep it alive — start today’s mission</span>
                  <span className="min-[420px]:hidden">Keep it alive — start mission</span>
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          {goal ? (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-bold">Next milestone: {goal}-day streak</h2>
                <span className="tabular text-[13px] text-muted">{streak}/{goal}</span>
              </div>
              <ProgressBar value={(streak - prevGoal) / (goal - prevGoal)} label={`Progress to a ${goal}-day streak`} />
              <p className="mt-2 text-[13px] text-faint">{goal - streak} more {goal - streak === 1 ? 'day' : 'days'} to go.</p>
            </>
          ) : (
            <>
              <h2 className="text-[15px] font-bold">Every streak milestone reached</h2>
              <ProgressBar className="mt-3" value={1} tone="success" label="All streak milestones reached" />
              <p className="mt-2 text-[13px] text-faint">30 days in a row. Nothing left to unlock here — just keep going.</p>
            </>
          )}
          <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Streak milestones">
            {STREAK_GOALS.map((g) => (
              <li key={g} className={streak >= g ? 'rounded-md bg-brand-500/15 py-2 text-center text-brand-300' : 'rounded-md bg-surface-2 py-2 text-center text-faint'}>
                <span className="tabular block text-[15px] font-extrabold">{g}</span>
                <span className="block text-[11px] font-medium">days</span>
              </li>
            ))}
          </ol>
        </Card>

        <section>
          <SectionHeader title="Your activity" />
          <Card>
            <Heatmap activeDays={activeDays} />
            <div className="mt-4 flex items-center gap-4 text-xs text-faint">
              <span className="flex items-center gap-1.5"><span className="bg-brand-gradient size-3 rounded-[4px]" aria-hidden /> Mission completed</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-surface-3" aria-hidden /> No activity</span>
            </div>
          </Card>
        </section>
      </div>
    </Page>
  )
}
