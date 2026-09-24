import { useEffect, useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Animates from 0 to the target on mount so progress always "fills in". */
function useAnimatedValue(value: number) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value))
    return () => cancelAnimationFrame(id)
  }, [value])
  return v
}

export function ProgressRing({ value, size = 120, stroke = 10, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const id = useId()
  const v = useAnimatedValue(Math.min(Math.max(value, 0), 1))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-brand-600)" />
            <stop offset="1" stopColor="var(--color-brand-400)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 1.1s var(--ease-out)', filter: 'drop-shadow(0 0 6px rgb(139 92 246 / 0.55))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function ProgressBar({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'success'; label: string }) {
  const v = useAnimatedValue(Math.min(Math.max(value, 0), 1))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className={cn('h-full rounded-full', tone === 'brand' ? 'bg-brand-gradient' : 'bg-success')} style={{ width: `${v * 100}%`, transition: 'width 0.9s var(--ease-out)' }} />
    </div>
  )
}
