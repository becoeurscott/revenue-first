import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AchievementBadge, AchievementMedal, achievementProgress } from '@/components/domain/AchievementBadge'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FilterChips } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { Sheet } from '@/components/ui/Sheet'
import { achievements } from '@/data/achievements'
import type { Achievement, StatsSnapshot } from '@/data/types'
import { useStats } from '@/store/selectors'

const FILTERS = ['All', 'Unlocked', 'Locked'] as const
type Filter = (typeof FILTERS)[number]

const hints: Record<keyof StatsSnapshot, { to: string; cta: string; tip: string }> = {
  missions: { to: '/plan', cta: 'Open my plan', tip: 'Complete daily missions to move this forward.' },
  daysCompleted: { to: '/plan', cta: 'Open my plan', tip: 'Finish every day of your 30-day plan.' },
  streak: { to: '/streak', cta: 'View my streak', tip: 'Complete a mission every day without skipping.' },
  prospects: { to: '/prospects', cta: 'Add prospects', tip: 'Add potential clients to your prospect list.' },
  contacted: { to: '/prospects', cta: 'Open prospects', tip: 'Send outreach to the prospects on your list.' },
  replies: { to: '/prospects', cta: 'Open prospects', tip: 'Keep sending personalized outreach. Replies follow volume.' },
  clients: { to: '/prospects', cta: 'Open prospects', tip: 'Move an interested prospect to Won.' },
  revenue: { to: '/revenue', cta: 'Open revenue tracker', tip: 'Mark a deal as collected once the client pays.' },
  lessons: { to: '/lessons', cta: 'Browse lessons', tip: 'Watch lessons from the library to the end.' },
}

export default function Achievements() {
  const navigate = useNavigate()
  const stats = useStats()
  const [filter, setFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<Achievement | null>(null)

  const isUnlocked = (a: Achievement) => stats[a.metric] >= a.target
  const unlockedCount = achievements.filter(isUnlocked).length
  const visible = achievements.filter((a) => (filter === 'All' ? true : filter === 'Unlocked' ? isUnlocked(a) : !isUnlocked(a)))
  const sel = selected ? achievementProgress(selected, stats[selected.metric]) : null
  const hint = selected ? hints[selected.metric] : null

  return (
    <Page title="Achievements" back>
      <div className="space-y-5">
        <Card variant="hero" className="animate-fade-up">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Your collection</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                <span className="tabular">{unlockedCount}</span> of <span className="tabular">{achievements.length}</span> unlocked
              </p>
            </div>
            <span className="tabular text-brand-gradient text-3xl font-extrabold tracking-tight">{Math.round((unlockedCount / achievements.length) * 100)}%</span>
          </div>
          <ProgressBar className="mt-4" value={unlockedCount / achievements.length} label="Achievements unlocked" />
        </Card>

        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          label="Filter achievements"
          counts={{ All: achievements.length, Unlocked: unlockedCount, Locked: achievements.length - unlockedCount }}
        />

        {visible.length ? (
          <div key={filter} className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((a) => (
              <AchievementBadge key={a.id} achievement={a} current={stats[a.metric]} onSelect={() => setSelected(a)} />
            ))}
          </div>
        ) : filter === 'Unlocked' ? (
          <EmptyState title="No achievements yet" description="Complete your first daily mission and your first badge unlocks right away." action={<Button onClick={() => navigate('/plan')}>Go to my plan</Button>} />
        ) : (
          <EmptyState mood="love" title="Nothing left to unlock" description="You collected every badge. That is the whole set." action={<Button variant="secondary" onClick={() => setFilter('All')}>Show all badges</Button>} />
        )}
      </div>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Achievement'}
        footer={
          selected && sel && hint ? (
            sel.unlocked ? (
              <Button variant="secondary" full onClick={() => setSelected(null)}>Done</Button>
            ) : (
              <Button full onClick={() => navigate(hint.to)} iconRight={<ArrowRight className="size-4" aria-hidden />}>{hint.cta}</Button>
            )
          ) : undefined
        }
      >
        {selected && sel && hint && (
          <div className="flex flex-col items-center pb-2 text-center">
            <div className="animate-pop"><AchievementMedal emoji={selected.emoji} unlocked={sel.unlocked} size={120} /></div>
            <div className="mt-4"><Badge tone={sel.unlocked ? 'success' : 'neutral'}>{sel.unlocked ? 'Unlocked' : 'Locked'}</Badge></div>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{selected.description}</p>
            <div className="mt-5 w-full rounded-lg border border-line bg-surface p-4 text-left">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold">Progress</span>
                <span className="tabular text-muted">{sel.text}</span>
              </div>
              <ProgressBar value={sel.value} tone={sel.unlocked ? 'success' : 'brand'} label={`${selected.title} progress`} />
              {!sel.unlocked && <p className="mt-3 text-[13px] leading-relaxed text-faint">{hint.tip}</p>}
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  )
}
