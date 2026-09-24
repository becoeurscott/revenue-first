import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Zap } from 'lucide-react'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { TOTAL_DAYS } from '@/data/missions'
import type { DayPlan, Lesson } from '@/data/types'

/** Full-screen success moment after a mission is completed. */
export function MissionComplete({ plan, streak, lesson }: { plan: DayPlan; streak: number; lesson?: Lesson }) {
  const navigate = useNavigate()
  const finale = plan.day >= TOTAL_DAYS
  return (
    <div className="fixed inset-0 z-40 flex justify-center overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="Mission complete">
      <Confetti />
      <div aria-hidden className="pointer-events-none absolute top-1/4 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-[100px]" />
      <div className="safe-top safe-bottom relative flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <Mascot mood="excited" size={170} tapLines={['We did it!', 'That is how first clients happen.', 'Same time tomorrow?']} />
          <h1 className="mt-6 animate-scale-in text-[34px] leading-none font-extrabold tracking-tight uppercase"><span className="text-brand-gradient">Mission complete</span> 🎉</h1>
          <p className="mt-3 animate-fade-up text-base text-muted [animation-delay:150ms]">Day {plan.day} completed.</p>

          <div className="stagger mt-8 grid w-full grid-cols-2 gap-3">
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
              <Zap className="mx-auto size-5 text-brand-300" aria-hidden />
              <p className="tabular mt-1.5 text-2xl font-extrabold">+{plan.xp} XP</p>
              <p className="text-xs text-muted">Earned</p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <span className="block animate-wiggle text-xl" aria-hidden>🔥</span>
              <p className="tabular mt-1 text-2xl font-extrabold">{streak} day{streak === 1 ? '' : 's'}</p>
              <p className="text-xs text-muted">Streak updated</p>
            </div>
          </div>

          {lesson && !finale && (
            <div className="mt-3 flex w-full animate-fade-up items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left [animation-delay:350ms]">
              <span className="bg-brand-gradient flex size-11 shrink-0 items-center justify-center rounded-full"><Play className="ml-0.5 size-4 fill-current text-white" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-wide text-success uppercase">Unlocked · Today's lesson</span>
                <span className="block truncate text-[15px] font-semibold">{lesson.title}</span>
                <span className="tabular block text-xs text-faint">{lesson.duration}</span>
              </span>
            </div>
          )}
        </div>

        <div className="w-full space-y-2 pb-6">
          {finale ? (
            <Button size="lg" full onClick={() => navigate('/30-day-complete', { replace: true })} iconRight={<ArrowRight className="size-5" aria-hidden />}>See My 30-Day Results</Button>
          ) : (
            <Button size="lg" full onClick={() => navigate(`/lessons/${plan.lessonId}`, { replace: true })} icon={<Play className="size-4 fill-current" aria-hidden />}>Watch Lesson</Button>
          )}
          <Button variant="ghost" full onClick={() => navigate('/home', { replace: true })}>Back to Home</Button>
        </div>
      </div>
    </div>
  )
}
