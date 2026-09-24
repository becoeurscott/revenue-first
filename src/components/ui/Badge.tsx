import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted border-line',
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  info: 'bg-info/12 text-info border-info/25',
}

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap', tones[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  const hue = [...name].reduce((h, c) => (h + c.charCodeAt(0) * 7) % 360, 0)
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))` }}
    >
      {initials || '?'}
    </span>
  )
}
