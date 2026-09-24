import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Compass, Crown, Loader2, Target } from 'lucide-react'
import { PlanPicker, useMockCheckout } from '@/components/domain/Paywall'
import { Mascot } from '@/components/mascot/Mascot'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Confetti } from '@/components/ui/Confetti'
import { ProgressRing } from '@/components/ui/Progress'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { analysisSteps, recommendPath } from '@/data/onboarding'
import { pathList, paths } from '@/data/paths'
import type { PathId, Plan } from '@/data/types'
import { cn, hueGradient } from '@/lib/cn'
import { useApp } from '@/store/useApp'

const STEP_MS = 850

function Analysis({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= analysisSteps.length) {
      const t = setTimeout(onDone, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [step, onDone])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 text-center" role="status" aria-live="polite">
      <ProgressRing value={step / analysisSteps.length} size={230} stroke={6} label="Building your plan">
        <Mascot mood={step >= analysisSteps.length ? 'excited' : 'thinking'} size={150} interactive={false} />
      </ProgressRing>
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Building your FirstRevenue plan…</h1>
      <ul className="mt-6 w-full max-w-xs space-y-3 text-left">
        {analysisSteps.map((label, i) => (
          <li key={label} className={cn('flex items-center gap-3 text-[15px] transition-all duration-300', i < step ? 'text-ink' : i === step ? 'text-muted' : 'text-faint opacity-50')}>
            <span className={cn('flex size-6 items-center justify-center rounded-full', i < step ? 'bg-success/15 text-success' : 'bg-surface-2 text-faint')}>
              {i < step ? <Check className="size-3.5 animate-pop" aria-hidden /> : i === step ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const answers = useApp((s) => s.answers)
  const premium = useApp((s) => s.subscription.status === 'active')
  const completeOnboarding = useApp((s) => s.completeOnboarding)
  const rec = useMemo(() => recommendPath(answers), [answers])
  const [ready, setReady] = useState(false)
  const [chosen, setChosen] = useState<PathId>(rec.pathId)
  const [explore, setExplore] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [plan, setPlan] = useState<Plan['id']>('yearly')

  const path = paths[chosen]
  const isRecommended = chosen === rec.pathId
  const other = pathList.find((p) => p.id !== chosen)!

  const finish = () => {
    completeOnboarding(chosen)
    navigate('/home', { replace: true })
  }
  const checkout = useMockCheckout(() => {
    toast.success('Premium unlocked 🎉')
    finish()
  })

  useEffect(() => {
    if (!answers.interest) navigate('/onboarding', { replace: true })
  }, [answers.interest, navigate])

  if (!ready) return <Analysis onDone={() => setReady(true)} />

  return (
    <div className="flex min-h-dvh justify-center bg-bg">
      <Confetti count={50} />
      <div className="safe-top safe-bottom w-full max-w-md px-5 pb-40">
        <div className="flex flex-col items-center pt-10 text-center">
          <Mascot mood="excited" size={130} />
          <p className="mt-5 text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Your path is ready{answers.name ? `, ${answers.name}` : ''}</p>
        </div>

        <div className="stagger mt-4 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 p-6 shadow-glow" style={{ background: hueGradient(path.hue) }}>
            <div className="flex items-start justify-between">
              <span className="text-4xl" aria-hidden>{path.emoji}</span>
              <Badge tone={isRecommended ? 'success' : 'neutral'} className="bg-black/40 backdrop-blur">{isRecommended ? `${rec.match}% match` : 'Your choice'}</Badge>
            </div>
            <h1 className="mt-4 text-[30px] leading-none font-extrabold tracking-tight text-white uppercase">{path.name}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85">{isRecommended ? rec.summary : path.description}</p>
          </div>

          {isRecommended && (
            <Card>
              <h2 className="text-[17px] font-bold">Why this path</h2>
              <ul className="mt-3 space-y-2.5">
                {rec.reasons.map((r) => (
                  <li key={r} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check className="size-3" aria-hidden /></span>
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs font-medium text-faint">Starting difficulty</p>
              <p className="mt-1 text-lg font-bold">{path.difficulty}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-faint">Typical first deal</p>
              <p className="mt-1 text-lg font-bold">{path.typicalPrice.split(' per')[0]}</p>
            </Card>
          </div>

          <Card>
            <h2 className="text-[17px] font-bold">Skills required</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {path.skills.map((s) => (
                <Badge key={s} tone={answers.skills.some((mine) => s.toLowerCase().includes(mine.toLowerCase().split(' ')[0])) ? 'success' : 'neutral'} className="h-7">{s}</Badge>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-faint">Green = you already have it. We teach the rest.</p>
          </Card>

          <Card>
            <h2 className="text-[17px] font-bold">Typical first tasks</h2>
            <ol className="mt-3 space-y-2.5">
              {path.firstTasks.map((t, i) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>

          <Card variant="hero">
            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-brand-300 uppercase"><Target className="size-4" aria-hidden /> 30-day objective</div>
            <p className="mt-2 text-lg leading-snug font-bold">{path.objective}</p>
          </Card>
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-line bg-bg/92 px-5 pt-3 backdrop-blur-xl">
        <div className="w-full max-w-md space-y-1 pb-4">
          <Button size="lg" full onClick={() => (premium ? finish() : setPaywall(true))} iconRight={<ArrowRight className="size-5" aria-hidden />}>
            Start My 30-Day Journey
          </Button>
          <Button variant="ghost" full onClick={() => setExplore(true)} icon={<Compass className="size-4" aria-hidden />}>
            Explore Other Paths
          </Button>
        </div>
      </div>

      <Sheet
        open={explore}
        onClose={() => setExplore(false)}
        title={other.name}
        description={other.tagline}
        footer={
          <Button full variant="secondary" onClick={() => { setChosen(other.id); setExplore(false); window.scrollTo({ top: 0, behavior: 'smooth' }); toast.info(`Switched to ${other.name}`) }}>
            Choose this path instead
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="flex h-24 items-center justify-center rounded-xl text-5xl" style={{ background: hueGradient(other.hue) }} aria-hidden>{other.emoji}</div>
          <p className="text-sm leading-relaxed text-muted">{other.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{other.difficulty}</Badge>
            <Badge>{other.typicalPrice}</Badge>
          </div>
          <div>
            <h3 className="text-sm font-bold">What the 4 weeks look like</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              {other.weeks.map((w) => (
                <li key={w.week}><span className="font-semibold text-ink-soft">Week {w.week} · {w.title}:</span> {w.focus.join(', ')}</li>
              ))}
            </ul>
          </div>
          {!isRecommended || <p className="text-[13px] text-faint">We recommended {paths[rec.pathId].name} for you, but you can switch any time.</p>}
        </div>
      </Sheet>

      <Sheet
        open={paywall}
        onClose={() => setPaywall(false)}
        title="Start your journey with Premium"
        description="Your full 30-day program, AI Coach, lessons and every tool."
        footer={
          <>
            <Button size="lg" full loading={checkout.loading} onClick={() => checkout.start(plan)} icon={<Crown className="size-4.5" aria-hidden />}>
              Start Premium
            </Button>
            <Button variant="ghost" full className="mt-1" disabled={checkout.loading} onClick={finish}>
              Maybe later — look around first
            </Button>
            <p className="text-center text-xs text-faint">Prototype checkout — no payment is taken.</p>
          </>
        }
      >
        <div className="pt-3 pb-2"><PlanPicker value={plan} onChange={setPlan} /></div>
      </Sheet>
    </div>
  )
}
