import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Lock, Repeat, Target, Wrench } from 'lucide-react'
import { LessonCard } from '@/components/domain/LessonCard'
import { PathPlanTab } from '@/components/domain/PathPlanTab'
import { usePathSwitch } from '@/components/domain/PathSwitch'
import { PracticeBusinessCard } from '@/components/domain/PracticeBusinessCard'
import { ProspectCard } from '@/components/domain/ProspectCard'
import { ResourceCard } from '@/components/domain/ResourceCard'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { lessons } from '@/data/lessons'
import { TOTAL_DAYS } from '@/data/missions'
import { pathList } from '@/data/paths'
import { seedProspects } from '@/data/prospects'
import { resources } from '@/data/resources'
import type { PathInfo } from '@/data/types'
import { hueGradient } from '@/lib/cn'
import { useApp } from '@/store/useApp'

const TABS = ['Overview', '30-Day Plan', 'Skills', 'Tools', 'Lessons', 'Resources', 'Clients'] as const
type Tab = (typeof TABS)[number]

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
          <span className="text-sm leading-relaxed text-muted">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function Overview({ path, active, onSwitch, premium }: { path: PathInfo; active: boolean; onSwitch: () => void; premium: boolean }) {
  const navigate = useNavigate()
  const progress = useApp((s) => s.progress[path.id])
  const done = progress.completedDays.length
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        {active ? (
          <Card variant="hero">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">Your progress</span>
              <span className="tabular text-muted">{done} / {TOTAL_DAYS} days</span>
            </div>
            <ProgressBar value={done / TOTAL_DAYS} label={`${path.name} progress`} />
            <Button full size="lg" className="mt-4" onClick={() => navigate(`/plan/day/${progress.currentDay}`)} iconRight={<ArrowRight className="size-4.5" aria-hidden />}>
              Continue Day {progress.currentDay}
            </Button>
          </Card>
        ) : (
          <Card variant="hero">
            <p className="text-[15px] font-semibold">{done ? `You completed ${done} of ${TOTAL_DAYS} days here` : 'You are not on this path yet'}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">Switching keeps all progress on your current path. {premium ? 'You can switch back at any time.' : 'Path switching is part of Premium.'}</p>
            <Button full size="lg" className="mt-4" onClick={onSwitch} icon={premium ? <Repeat className="size-4.5" aria-hidden /> : <Lock className="size-4.5" aria-hidden />}>
              Switch to this path
            </Button>
          </Card>
        )}
        <Card>
          <h3 className="text-[17px] font-bold tracking-tight">About this path</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{path.description}</p>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand-500/25 bg-brand-500/[0.07] p-3.5">
            <Target className="mt-0.5 size-4.5 shrink-0 text-brand-300" aria-hidden />
            <div>
              <p className="text-xs font-semibold tracking-wider text-faint uppercase">30-day objective</p>
              <p className="mt-0.5 text-[15px] leading-snug font-medium">{path.objective}</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <h3 className="mb-3 text-[17px] font-bold tracking-tight">Typical first tasks</h3>
          <NumberedList items={path.firstTasks} />
        </Card>
        <Card>
          <h3 className="mb-3 text-[17px] font-bold tracking-tight">How the work flows</h3>
          <NumberedList items={path.workflow} />
        </Card>
      </div>
    </div>
  )
}

function Clients({ path, active }: { path: PathInfo; active: boolean }) {
  const navigate = useNavigate()
  const won = useApp((s) => s.prospects).filter((p) => p.path === path.id && p.status === 'Won')
  const practice = path.id === 'gbp' ? seedProspects.filter((p) => p.path === 'gbp') : []
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Your clients" to={won.length ? '/prospects' : undefined} action="All prospects" />
        {won.length ? (
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {won.map((p) => <ProspectCard key={p.id} prospect={p} />)}
          </div>
        ) : (
          <EmptyState
            compact
            mood="focused"
            title="No clients yet"
            description={active ? 'Every client starts as a prospect. Add a few, reach out, and your first win shows up here.' : 'Clients you win on this path will show up here.'}
            action={<Button onClick={() => navigate('/prospects')}>Go to prospects</Button>}
          />
        )}
      </section>
      {practice.length > 0 && (
        <section>
          <SectionHeader title="Practice businesses" />
          <p className="-mt-1 mb-4 text-sm leading-relaxed text-muted">Fictitious local businesses with pre-run audits. Use them to practise spotting problems and pitching a fix.</p>
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {practice.map((b) => <PracticeBusinessCard key={b.id} business={b} canAdd />)}
          </div>
        </section>
      )}
    </div>
  )
}

export default function PathDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Overview')
  const activeId = useApp((s) => s.pathId)
  const { request, dialogs, premium } = usePathSwitch()
  const path = pathList.find((p) => p.slug === slug)

  if (!path) {
    return (
      <Page title="Path" back="/paths">
        <EmptyState mood="sad" title="Path not found" description="This path does not exist. Pick one of the two FirstRevenue paths instead." action={<Button onClick={() => navigate('/paths')}>See all paths</Button>} />
      </Page>
    )
  }

  const active = path.id === activeId
  const pathLessons = lessons.filter((l) => l.path === path.id)
  const pathResources = resources.filter((r) => r.path === path.id || r.path === 'all')

  return (
    <Page title={path.name} back="/paths">
      <header className="relative animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="absolute inset-0 opacity-30" style={{ background: hueGradient(path.hue) }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-3xl backdrop-blur" aria-hidden>{path.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {active && <Badge tone="brand">Active path</Badge>}
                <Badge tone="success">{path.difficulty}</Badge>
              </div>
              <h2 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">{path.name}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft/80">{path.tagline}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-bg/50 p-3.5 backdrop-blur">
              <dt className="text-xs font-semibold tracking-wider text-faint uppercase">Typical price</dt>
              <dd className="mt-0.5 text-[15px] font-semibold">{path.typicalPrice}</dd>
            </div>
            <div className="rounded-lg border border-line bg-bg/50 p-3.5 backdrop-blur">
              <dt className="text-xs font-semibold tracking-wider text-faint uppercase">What you sell</dt>
              <dd className="mt-0.5 text-sm leading-snug text-ink-soft">{path.service}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Tabs options={TABS} value={tab} onChange={setTab} label={`${path.name} sections`} />
      </div>

      <div key={tab} role="tabpanel" aria-label={tab} className="animate-fade-up pt-2">
        {tab === 'Overview' && <Overview path={path} active={active} premium={premium} onSwitch={() => request(path.id)} />}
        {tab === '30-Day Plan' && <PathPlanTab path={path} active={active} />}
        {tab === 'Skills' && (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {path.skills.map((skill, i) => {
              const week = path.weeks[Math.min(path.weeks.length - 1, Math.floor((i * path.weeks.length) / path.skills.length))]
              return (
                <li key={skill} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                  <span className="tabular bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug font-semibold">{skill}</p>
                    <p className="mt-1 text-[13px] text-faint">Practised from Week {week.week} · {week.title}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {tab === 'Tools' && (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {path.tools.map((t) => (
              <li key={t.name} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-300"><Wrench className="size-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold">{t.name}</p>
                    <Badge tone={t.cost === 'Free' ? 'success' : 'neutral'}>{t.cost}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.purpose}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {tab === 'Lessons' && (
          pathLessons.length ? (
            <>
              <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
                {pathLessons.slice(0, 9).map((l) => <LessonCard key={l.id} lesson={l} />)}
              </div>
              <div className="mt-5 flex justify-center">
                <Link to="/lessons" className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-brand-300 transition-colors hover:border-line-strong hover:bg-surface-2">
                  See all lessons <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </>
          ) : (
            <EmptyState compact title="No lessons yet" description="Lessons for this path will appear here." action={<Button onClick={() => navigate('/lessons')}>Browse the library</Button>} />
          )
        )}
        {tab === 'Resources' && (
          pathResources.length ? (
            <div className="stagger grid gap-3 lg:grid-cols-2">
              {pathResources.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          ) : (
            <EmptyState compact title="No resources yet" description="Templates and tools for this path will appear here." action={<Button onClick={() => navigate('/resources')}>Browse resources</Button>} />
          )
        )}
        {tab === 'Clients' && <Clients path={path} active={active} />}
      </div>
      {dialogs}
    </Page>
  )
}
