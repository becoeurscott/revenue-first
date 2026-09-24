import { Lock } from 'lucide-react'
import { ProgressBar } from '@/components/ui/Progress'
import type { Achievement } from '@/data/types'
import { cn, money } from '@/lib/cn'

export function achievementProgress(a: Achievement, current: number) {
  const capped = Math.min(Math.max(current, 0), a.target)
  const fmt = (n: number) => (a.money ? money(n) : String(n))
  return { value: capped / a.target, unlocked: current >= a.target, text: `${fmt(capped)} / ${fmt(a.target)}` }
}

/** Round medallion with the achievement emoji. Unlocked = gradient ring + glow. */
export function AchievementMedal({ emoji, unlocked, size = 72 }: { emoji: string; unlocked: boolean; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {unlocked && <span className="absolute inset-1 animate-pulse-glow rounded-full bg-brand-500/40 blur-xl" />}
      <span className={cn('relative flex size-full items-center justify-center rounded-full p-[3px]', unlocked ? 'bg-brand-gradient shadow-glow-sm' : 'bg-line-strong')}>
        <span className={cn('flex size-full items-center justify-center rounded-full bg-surface-2', !unlocked && 'opacity-60 grayscale')} style={{ fontSize: size * 0.42, lineHeight: 1 }}>
          {emoji}
        </span>
      </span>
      {!unlocked && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-muted">
          <Lock className="size-3" />
        </span>
      )}
    </span>
  )
}

export function AchievementBadge({ achievement: a, current, onSelect }: { achievement: Achievement; current: number; onSelect: () => void }) {
  const p = achievementProgress(a, current)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${a.title} — ${p.unlocked ? 'unlocked' : `locked, ${p.text}`}`}
      className={cn(
        'flex w-full flex-col items-center rounded-xl border p-4 text-center transition-all duration-200 active:scale-[0.98]',
        p.unlocked ? 'border-brand-500/30 bg-brand-500/[0.07] hover:border-brand-500/50' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <AchievementMedal emoji={a.emoji} unlocked={p.unlocked} />
      <span className={cn('mt-3 line-clamp-1 text-sm font-bold tracking-tight', !p.unlocked && 'text-muted')}>{a.title}</span>
      {p.unlocked ? (
        <span className="mt-1.5 text-xs font-semibold text-brand-300">Unlocked</span>
      ) : (
        <span className="mt-2 block w-full">
          <ProgressBar value={p.value} label={`${a.title} progress`} />
          <span className="tabular mt-1.5 block text-xs text-faint">{p.text}</span>
        </span>
      )}
    </button>
  )
}
