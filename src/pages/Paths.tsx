import { useNavigate } from 'react-router-dom'
import { ArrowRight, Compass, Crown, Lock, Repeat, Save, Target } from 'lucide-react'
import { usePathSwitch } from '@/components/domain/PathSwitch'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { pathList } from '@/data/paths'
import { hueGradient } from '@/lib/cn'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const explainer = [
  { icon: Compass, title: 'One path at a time', body: 'Your daily missions, lessons and resources follow the path you are on, so you always know what to do next.' },
  { icon: Save, title: 'Progress is never lost', body: 'Each path keeps its own day count. Switch away and come back — you pick up exactly where you stopped.' },
  { icon: Repeat, title: 'Switching is a Premium feature', body: 'Exploring any path is free. Running both programs is part of Premium.' },
]

export default function Paths() {
  const navigate = useNavigate()
  const { path, progress, totalDays } = useProgram()
  const allProgress = useApp((s) => s.progress)
  const { request, dialogs, premium } = usePathSwitch()
  const other = pathList.find((p) => p.id !== path.id) ?? pathList[0]
  const otherDone = allProgress[other.id].completedDays.length
  const done = progress.completedDays.length

  return (
    <Page title="Paths" subtitle="Two proven ways to earn your first money online." large>
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="current-path">
          <SectionHeader title="Current path" />
          <Card variant="hero" className="animate-fade-up">
            <div className="flex items-start gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-lg text-3xl shadow-glow-sm" style={{ background: hueGradient(path.hue) }} aria-hidden>
                {path.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <Badge tone="brand">Active</Badge>
                <h2 id="current-path" className="mt-1.5 text-xl leading-tight font-extrabold tracking-tight">{path.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{path.tagline}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between text-[13px]">
                <span className="font-semibold">Day <span className="tabular">{progress.currentDay}</span> of {totalDays}</span>
                <span className="tabular text-muted">{done} {done === 1 ? 'day' : 'days'} completed</span>
              </div>
              <ProgressBar value={done / totalDays} label={`${path.name} progress`} />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-bg/40 p-3.5">
              <Target className="mt-0.5 size-4.5 shrink-0 text-brand-300" aria-hidden />
              <div>
                <p className="text-xs font-semibold tracking-wider text-faint uppercase">30-day goal</p>
                <p className="mt-0.5 text-[15px] leading-snug font-medium">{path.objective}</p>
              </div>
            </div>

            <h3 className="mt-5 text-xs font-semibold tracking-wider text-faint uppercase">Skills you build</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {path.skills.map((s) => (
                <li key={s} className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-[13px] leading-snug text-ink-soft">{s}</li>
              ))}
            </ul>

            <h3 className="mt-5 text-xs font-semibold tracking-wider text-faint uppercase">Expected workflow</h3>
            <ol className="mt-3 space-y-3">
              {path.workflow.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-muted">{step}</span>
                </li>
              ))}
            </ol>

            <Button full size="lg" className="mt-6" onClick={() => navigate(`/paths/${path.slug}`)} iconRight={<ArrowRight className="size-4.5" aria-hidden />}>
              Open path dashboard
            </Button>
          </Card>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="other-path">
            <SectionHeader title="Other path" />
            <Card variant={premium ? 'default' : 'locked'} className="animate-fade-up">
              <div
                role={premium ? undefined : 'button'}
                tabIndex={premium ? undefined : 0}
                aria-label={premium ? undefined : `${other.name} — unlock path switching with Premium`}
                onClick={premium ? undefined : () => request(other.id)}
                onKeyDown={premium ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), request(other.id))}
                className={premium ? undefined : 'cursor-pointer'}
              >
                <div className="flex items-start gap-4">
                  <span className="relative flex size-14 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ background: hueGradient(other.hue) }} aria-hidden>
                    <span className={premium ? undefined : 'opacity-50 grayscale'}>{other.emoji}</span>
                    {!premium && (
                      <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-ink">
                        <Lock className="size-3" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {premium ? <Badge tone="success">Available</Badge> : <Badge tone="brand" icon={<Crown className="size-3" aria-hidden />}>Premium</Badge>}
                    <h2 id="other-path" className="mt-1.5 text-lg leading-tight font-bold tracking-tight">{other.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{other.tagline}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-md bg-surface-2 p-3">
                    <dt className="text-faint">Typical price</dt>
                    <dd className="mt-0.5 font-semibold">{other.typicalPrice}</dd>
                  </div>
                  <div className="rounded-md bg-surface-2 p-3">
                    <dt className="text-faint">Your progress</dt>
                    <dd className="tabular mt-0.5 font-semibold">{otherDone ? `${otherDone} / ${totalDays} days` : 'Not started'}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                <Button variant="secondary" full onClick={() => navigate(`/paths/${other.slug}`)}>Explore</Button>
                <Button full onClick={() => request(other.id)} icon={premium ? <Repeat className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}>
                  {premium ? 'Switch to this path' : 'Unlock switching'}
                </Button>
              </div>
            </Card>
          </section>

          <section aria-labelledby="how-paths-work">
            <Card>
              <h2 id="how-paths-work" className="text-[17px] font-bold tracking-tight">How paths work</h2>
              <ul className="mt-4 space-y-4">
                {explainer.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-brand-300"><Icon className="size-4.5" aria-hidden /></span>
                    <div>
                      <p className="text-[15px] font-semibold">{title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      </div>
      {dialogs}
    </Page>
  )
}
