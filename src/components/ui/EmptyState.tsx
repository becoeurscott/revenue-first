import type { ReactNode } from 'react'
import { Mascot, type MascotMood } from '@/components/mascot/Mascot'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  title: string
  description: string
  mood?: MascotMood
  action?: ReactNode
  compact?: boolean
  className?: string
}

/** One polished pattern for empty, error and offline states. */
export function EmptyState({ title, description, mood = 'wink', action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn('flex animate-fade-up flex-col items-center rounded-xl border border-dashed border-line px-6 text-center', compact ? 'py-8' : 'py-12', className)}>
      <Mascot mood={mood} size={compact ? 88 : 116} />
      <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
