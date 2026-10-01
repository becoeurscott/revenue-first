import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, CheckCircle2, Clock, Crown, FolderOpen, Lock, MessageSquareText, Search, ShieldCheck, Sparkles, Tag, Target, Wallet, Zap } from 'lucide-react'
import { LessonCard } from '@/components/domain/LessonCard'
import { Page } from '@/components/layout/Page'
import { Mascot } from '@/components/mascot/Mascot'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, LinkCard, SectionHeader } from '@/components/ui/Card'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { achievements } from '@/data/achievements'
import { coachTips } from '@/data/coach'
import { getLesson } from '@/data/lessons'
import { money } from '@/lib/cn'
import { greeting } from '@/lib/date'
import { usePremium, useProgram, useStats, useUnreadCount } from '@/store/selectors'
import { useApp } from '@/store/useApp'

function MissionHero() {
  const navigate = useNavigate()
  const { today, todayDone, tasksDone, progress, finished, totalDays } = useProgram()
  const advanceDay = useApp((s) => s.advanceDay)
  const lessonDone = useApp((s) => s.completedLessons.includes(today.lessonId))

  if (finished) {
    return (
      <Card variant="hero" className="flex h-full flex-col">
        <Badge tone="success" className="self-start">Program complete</Badge>
        <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">You finished all 30 days. 🎉</h2>
        <p className="mt-2 text-sm text-muted">See your results and choose what happens next.</p>
        <Button size="lg" full className="mt-5" onClick={() => navigate('/30-day-complete')} iconRight={<ArrowRight className="size-5" aria-hidden />}>View My Results</Button>
      </Card>
    )
  }

  if (todayDone) {
    return (
      <Card variant="completed" className="flex h-full flex-col">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-success uppercase">
          <CheckCircle2 className="size-4" aria-hidden /> Day {today.day} complete
        </div>
        <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">{today.theme}</h2>
        <p className="mt-2 text-sm text-muted">{lessonDone ? 'Mission and lesson done. Rest up — or get ahead while you have momentum.' : 'Nice work. Your lesson is unlocked — it takes a few minutes and makes tomorrow easier.'}</p>
        <div className="mt-5 space-y-2">
          {!lessonDone && <Button size="lg" full onClick={() => navigate(`/lessons/${today.lessonId}`)}>Watch Today's Lesson</Button>}
          {today.day < totalDays ? (
            <Button size="lg" full variant={lessonDone ? 'primary' : 'secondary'} onClick={() => { advanceDay(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} iconRight={<ArrowRight className="size-5" aria-hidden />}>
              Start Day {today.day + 1} Early
            </Button>
          ) : null}
        </div>
      </Card>
    )
  }

  const started = tasksDone > 0
  return (
    <Card variant="hero" className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Today's mission</span>
        <Badge tone="brand" icon={<Zap className="size-3" aria-hidden />}>+{today.xp} XP</Badge>
      </div>
      <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight">{today.missionTitle}</h2>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden /> {today.minutes} min</span>
        <span className="inline-flex items-center gap-1.5"><Tag className="size-3.5" aria-hidden /> {today.difficulty}</span>
      </div>
      {started && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-medium text-muted"><span>In progress</span><span className="tabular">{tasksDone} / {today.tasks.length} tasks</span></div>
          <ProgressBar value={tasksDone / today.tasks.length} label="Mission progress" />
        </div>
      )}
      <div className="mt-auto pt-5">
        <Button size="lg" full onClick={() => navigate(`/mission/${progress.currentDay}`)} iconRight={<ArrowRight className="size-5" aria-hidden />}>
          {started ? 'Continue Mission' : 'Start Mission'}
        </Button>
      </div>
    </Card>
  )
}

const quickActions = [
  { to: '/prospects', label: 'Prospects', icon: MessageSquareText },
  { to: '/pricing', label: 'Pricing', icon: Tag },
  { to: '/revenue', label: 'Revenue', icon: Wallet },
  { to: '/resources', label: 'Resources', icon: FolderOpen },
]

export default function Home() {
  const user = useApp((s) => s.user)
  const prospects = useApp((s) => s.prospects)
  const deals = useApp((s) => s.deals)
  const playbook = useApp((s) => s.playbook)
  const niche = useApp((s) => s.answers.niche ?? '')
  const { today, todayDone, progress, path, pathId, totalDays } = useProgram()
  const stats = useStats()
  const unread = useUnreadCount()
  const premium = usePremium()
  const navigate = useNavigate()
  const lesson = getLesson(today.lessonId)
  const first = user.name.split(' ')[0] || 'there'

  const next = achievements.find((a) => stats[a.metric] < a.target)
  const tips = coachTips[pathId]
  const tip = tips[progress.currentDay % tips.length]

  const wins: { emoji: string; text: string }[] = []
  const collected = deals.find((d) => d.status === 'Collected')
  if (collected) wins.push({ emoji: '💸', text: `${collected.client} paid you ${money(collected.amount)}` })
  const won = prospects.find((p) => p.status === 'Won')
  if (won) wins.push({ emoji: '🏆', text: `You won ${won.business} as a client` })
  if (stats.replies > 0) wins.push({ emoji: '💬', text: `${stats.replies} prospect${stats.replies > 1 ? 's' : ''} replied to your outreach` })
  if (stats.daysCompleted > 0) wins.push({ emoji: '✅', text: `${stats.daysCompleted} mission${stats.daysCompleted > 1 ? 's' : ''} completed on this path` })
  if (stats.streak >= 3) wins.push({ emoji: '🔥', text: `${stats.streak}-day streak and counting` })

  return (
    <Page
      large
      title={`${greeting()}, ${first}`}
      subtitle={`Day ${progress.currentDay} of ${totalDays} · ${path.name}`}
      actions={
        <>
          <IconButton label="Search" onClick={() => navigate('/search')} className="lg:hidden"><Search className="size-5" aria-hidden /></IconButton>
          <IconButton label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => navigate('/notifications')}>
            <Bell className="size-5" aria-hidden />
            {unread > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-danger ring-2 ring-surface" />}
          </IconButton>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3"><MissionHero /></div>

        <Card className="flex items-center gap-5 lg:col-span-2 lg:flex-col lg:justify-center lg:text-center">
          <ProgressRing value={stats.daysCompleted / totalDays} size={124} label="30-day completion">
            <span className="tabular text-[28px] leading-none font-extrabold tracking-tight">{progress.currentDay}<span className="text-base text-faint"> / {totalDays}</span></span>
            <span className="mt-1 text-[11px] font-semibold tracking-wider text-faint uppercase">Day</span>
          </ProgressRing>
          <div className="min-w-0 flex-1 space-y-2.5 lg:w-full lg:flex-none">
            <Link to="/streak" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 transition-colors hover:border-line-strong">
              <span className="text-sm text-muted">Streak</span>
              <span className="tabular text-base font-bold whitespace-nowrap">🔥 {stats.streak} day{stats.streak === 1 ? '' : 's'}</span>
            </Link>
            <Link to="/progress" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 transition-colors hover:border-line-strong">
              <span className="text-sm text-muted">Level {stats.level}</span>
              <span className="tabular text-base font-bold whitespace-nowrap">{stats.xp} XP</span>
            </Link>
          </div>
        </Card>
      </div>

      {!premium && (
        <LinkCard to="/subscription" variant="selected" className="mt-4 flex items-center gap-3">
          <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-full"><Crown className="size-5 text-white" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Unlock your full journey</span>
            <span className="block text-[13px] text-muted">AI Coach, outreach assistant, pricing and path switching.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-brand-300" aria-hidden />
        </LinkCard>
      )}

      <nav aria-label="Quick actions" className="mt-4 grid grid-cols-4 gap-2.5">
        {quickActions.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-19 flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-muted transition-all duration-200 hover:border-line-strong hover:text-ink active:scale-95">
            <Icon className="size-5 text-brand-300" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <LinkCard to="/playbook" className="mt-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"><Target className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{playbook ? `Your ${playbook.niche} playbook` : niche ? `Build your ${niche} playbook` : 'Get a playbook for your niche'}</span>
          <span className="block text-[13px] text-muted">{playbook ? (playbook.dailyTips[progress.currentDay - 1] ?? playbook.summary) : 'What to sell, what to charge and who to message — tailored by AI.'}</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-faint" aria-hidden />
      </LinkCard>

      <div className="mt-8 grid gap-x-6 gap-y-8 lg:grid-cols-2">
        {lesson && (
          <section>
            <SectionHeader title="Today's Lesson" to="/lessons" action="Library" />
            <LessonCard lesson={lesson} layout="row" locked={!todayDone} />
            {!todayDone && <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-faint"><Lock className="size-3" aria-hidden /> Unlocks when you complete today's mission</p>}
          </section>
        )}

        <section>
          <SectionHeader title="Current Goal" to="/revenue" action="Revenue" />
          <Card>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] text-muted">Earn your first {money(user.goalAmount)}</p>
                <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">{money(stats.revenue)}<span className="text-base font-semibold text-faint"> / {money(user.goalAmount)}</span></p>
              </div>
              <Badge tone={stats.revenue > 0 ? 'success' : 'neutral'}>{Math.min(100, Math.round((stats.revenue / user.goalAmount) * 100))}%</Badge>
            </div>
            <ProgressBar className="mt-4" value={stats.revenue / user.goalAmount} tone="success" label="Progress to income goal" />
            <p className="mt-3 text-[13px] text-faint">{stats.booked > 0 ? `${money(stats.booked)} more is booked and ${money(stats.potential)} is in your pipeline.` : stats.potential > 0 ? `${money(stats.potential)} in your pipeline. Keep following up.` : 'Your first dollar comes from your first conversation. Start with today’s mission.'}</p>
          </Card>
        </section>

        <section>
          <SectionHeader title="Your Path" to="/paths" action="All paths" />
          <LinkCard to={`/paths/${path.slug}`} className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-3xl" aria-hidden>{path.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold">{path.name}</span>
              <span className="block truncate text-[13px] text-muted">Week {today.week} · {path.weeks[today.week - 1]?.title}</span>
              <ProgressBar className="mt-2.5" value={stats.daysCompleted / totalDays} label="Path progress" />
            </span>
          </LinkCard>
        </section>

        {next && (
          <section>
            <SectionHeader title="Upcoming Milestone" to="/achievements" action="Badges" />
            <LinkCard to="/achievements" className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-2xl grayscale" aria-hidden>{next.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{next.title}</span>
                <span className="block truncate text-[13px] text-muted">{next.description}</span>
                <span className="mt-2.5 flex items-center gap-3">
                  <ProgressBar value={stats[next.metric] / next.target} label={`${next.title} progress`} />
                  <span className="tabular shrink-0 text-xs font-semibold text-muted">{next.money ? `${money(stats[next.metric])} / ${money(next.target)}` : `${stats[next.metric]} / ${next.target}`}</span>
                </span>
              </span>
            </LinkCard>
          </section>
        )}

        <section>
          <SectionHeader title="Recent Wins" to="/progress" action="Progress" />
          {wins.length ? (
            <Card pad={false} className="divide-y divide-line">
              {wins.slice(0, 4).map((w) => (
                <div key={w.text} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                  <span className="text-lg" aria-hidden>{w.emoji}</span>
                  <span className="text-ink-soft">{w.text}</span>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="text-sm leading-relaxed text-muted">Your wins will show up here. The first one is a single mission away.</Card>
          )}
        </section>

        <section>
          <SectionHeader title="Protect Your Money" to="/lessons" action="Lessons" />
          <LinkCard to="/mentor-check" className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success"><ShieldCheck className="size-7" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Mentor Check</span>
              <span className="block text-[13px] text-muted">About to pay for a course or coach? Spot fake gurus in 2 minutes.</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-faint" aria-hidden />
          </LinkCard>
        </section>

        <section>
          <SectionHeader title="Coach Tip" to="/coach" action="Ask coach" />
          <Card className="flex items-start gap-3">
            <Mascot mood="wink" size={64} float={false} className="-mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-ink-soft">{tip}</p>
              <Link to="/coach" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-brand-300 hover:text-brand-400">
                <Sparkles className="size-3.5" aria-hidden /> Ask a follow-up
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </Page>
  )
}
