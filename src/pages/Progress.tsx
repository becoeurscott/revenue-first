import { Check, ChevronRight, ClipboardCheck, Lock, PartyPopper, Trophy, Zap } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Card, LinkCard, SectionHeader } from '@/components/ui/Card'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { StatCard } from '@/components/ui/StatCard'
import { cn, money } from '@/lib/cn'
import { useProgram, useStats } from '@/store/selectors'
import { useApp } from '@/store/useApp'

interface Milestone {
  title: string
  emoji: string
  current: number
  target: number
  money?: boolean
  hint: string
}

export default function Progress() {
  const { path, progress, finished, totalDays } = useProgram()
  const stats = useStats()
  const goalAmount = useApp((s) => s.user.goalAmount) || 500
  const done = progress.completedDays.length
  const pct = Math.round((done / totalDays) * 100)

  const milestones: Milestone[] = [
    { title: 'First Mission', emoji: '👣', current: stats.missions, target: 1, hint: 'Complete your first daily mission' },
    { title: '3-Day Streak', emoji: '🔥', current: Math.max(stats.streak, Math.min(stats.longestStreak, 3)), target: 3, hint: 'Show up three days in a row' },
    { title: 'First Prospect', emoji: '🔍', current: stats.prospects, target: 1, hint: 'Add one potential client' },
    { title: '10 Prospects', emoji: '📋', current: stats.prospects, target: 10, hint: 'Build a list of 10 potential clients' },
    { title: 'First Reply', emoji: '💬', current: stats.replies, target: 1, hint: 'Get a reply from a prospect' },
    { title: 'First Client', emoji: '🤝', current: stats.clients, target: 1, hint: 'Turn a prospect into a paying client' },
    { title: 'First $100', emoji: '💵', current: stats.revenue, target: 100, money: true, hint: 'Collect your first $100' },
    { title: 'First $500', emoji: '💰', current: stats.revenue, target: 500, money: true, hint: 'Reach $500 collected' },
  ]
  const nextIndex = milestones.findIndex((m) => m.current < m.target)
  const achievedCount = milestones.filter((m) => m.current >= m.target).length
  const fmt = (m: Milestone, n: number) => (m.money ? money(n) : String(n))

  return (
    <Page title="Progress" subtitle={`Day ${progress.currentDay} of ${totalDays} · ${path.name}`} large>
      <div className="space-y-8">
        <Card variant="hero" className="animate-fade-up">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <ProgressRing value={done / totalDays} size={168} stroke={14} label="30-day completion">
              <span className="tabular text-4xl font-extrabold tracking-tight">{pct}%</span>
              <span className="tabular mt-0.5 text-[13px] text-muted">{done}/{totalDays} days</span>
            </ProgressRing>
            <div className="w-full min-w-0 flex-1 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-full text-white"><Zap className="size-3.5 fill-current" aria-hidden /></span>
                    Level <span className="tabular">{stats.level}</span>
                  </span>
                  <span className="tabular text-[13px] text-muted">{stats.xp.toLocaleString('en-US')} XP · {400 - (stats.xp % 400)} to next level</span>
                </div>
                <ProgressBar value={stats.levelProgress} label={`Level ${stats.level} progress`} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[15px] font-bold">Revenue goal</span>
                  <span className="tabular text-[13px] text-muted"><span className="font-semibold text-ink">{money(stats.revenue)}</span> of {money(goalAmount)}</span>
                </div>
                <ProgressBar value={stats.revenue / goalAmount} tone="success" label="Revenue goal progress" />
                <p className="mt-2 text-[13px] text-faint">
                  {stats.revenue >= goalAmount ? 'Goal reached. Time to set a bigger one.' : `${money(goalAmount - stats.revenue)} to go. ${stats.booked ? `${money(stats.booked)} is already booked.` : 'One client can close most of that gap.'}`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {finished && (
          <LinkCard to="/30-day-complete" variant="selected" className="flex animate-scale-in items-center gap-4">
            <span className="bg-brand-gradient flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-glow"><PartyPopper className="size-6" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold tracking-tight">You finished all 30 days</span>
              <span className="block text-sm text-muted">See your results and choose what happens next.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-brand-300" aria-hidden />
          </LinkCard>
        )}

        <section aria-label="Your numbers">
          <SectionHeader title="Your numbers" />
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon="🔥" value={stats.streak} label="Current streak" to="/streak" />
            <StatCard icon="🏅" value={stats.longestStreak} label="Longest streak" />
            <StatCard icon="🎯" value={stats.missions} label="Missions completed" />
            <StatCard icon="🎬" value={stats.lessons} label="Lessons watched" to="/lessons" />
            <StatCard icon="📨" value={stats.contacted} label="Prospects contacted" to="/prospects" />
            <StatCard icon="🤝" value={stats.clients} label="Clients won" />
            <StatCard icon="💸" value={money(stats.revenue)} label="Revenue earned" to="/revenue" accent />
            <StatCard icon="💬" value={stats.replies} label="Replies" />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-5">
          <section className="lg:col-span-3" aria-label="Milestones">
            <SectionHeader title="Milestones" to="/achievements" action="All achievements" />
            <Card>
              <p className="tabular mb-4 text-[13px] text-muted">{achievedCount} of {milestones.length} reached</p>
              <ol>
                {milestones.map((m, i) => {
                  const achieved = m.current >= m.target
                  const next = i === nextIndex
                  const last = i === milestones.length - 1
                  return (
                    <li key={m.title} className="relative flex gap-4 pb-5 last:pb-0">
                      {!last && <span className={cn('absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 rounded-full', achieved ? 'bg-brand-500/50' : 'bg-line')} aria-hidden />}
                      <span
                        className={cn(
                          'relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full',
                          achieved && 'bg-brand-gradient text-white shadow-glow-sm',
                          next && 'border-2 border-brand-500/60 bg-brand-500/15 text-lg',
                          !achieved && !next && 'border border-line bg-surface-2 text-faint',
                        )}
                        aria-hidden
                      >
                        {achieved ? <Check className="size-5" strokeWidth={3} /> : next ? m.emoji : <Lock className="size-4" />}
                      </span>
                      <div className={cn('min-w-0 flex-1 pt-0.5', next && '-mt-1 rounded-lg border border-brand-500/30 bg-brand-500/[0.07] p-3')}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('truncate text-[15px] font-semibold', !achieved && !next && 'text-muted')}>{m.title}</p>
                          {achieved && <Badge tone="success">Reached</Badge>}
                          {next && <Badge tone="brand">Next up</Badge>}
                        </div>
                        <p className="mt-0.5 text-[13px] text-faint">{m.hint}</p>
                        {next && (
                          <div className="mt-2.5">
                            <ProgressBar value={m.current / m.target} label={`${m.title} progress`} />
                            <p className="tabular mt-1.5 text-xs font-medium text-muted">{fmt(m, Math.min(m.current, m.target))} of {fmt(m, m.target)} · {fmt(m, m.target - m.current)} to go</p>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>
          </section>

          <div className="space-y-3 lg:col-span-2">
            <SectionHeader title="Keep going" />
            <LinkCard to="/check-in" className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-300"><ClipboardCheck className="size-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Weekly check-in</span>
                <span className="block text-[13px] text-muted">3 minutes to reflect and set next week's focus. +50 XP</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </LinkCard>
            <LinkCard to="/achievements" className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-warning/12 text-warning"><Trophy className="size-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">All achievements</span>
                <span className="block text-[13px] text-muted">See every badge you can unlock.</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </LinkCard>
          </div>
        </div>
      </div>
    </Page>
  )
}
