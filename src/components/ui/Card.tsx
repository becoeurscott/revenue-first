import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export type CardVariant = 'default' | 'interactive' | 'selected' | 'locked' | 'completed' | 'hero'

const variants: Record<CardVariant, string> = {
  default: 'bg-surface border-line',
  interactive: 'bg-surface border-line hover:border-line-strong hover:bg-surface-2 active:scale-[0.99] cursor-pointer',
  selected: 'bg-brand-500/12 border-brand-500/50 shadow-glow-sm',
  locked: 'bg-bg-raised border-line border-dashed opacity-70',
  completed: 'bg-success/[0.06] border-success/25',
  hero: 'border-brand-500/25 bg-[radial-gradient(120%_140%_at_0%_0%,rgb(124_58_237/0.28),transparent_55%),linear-gradient(180deg,var(--color-surface-2),var(--color-surface))] shadow-card',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  pad?: boolean
}

export function Card({ variant = 'default', pad = true, className, ...rest }: CardProps) {
  return <div className={cn('rounded-xl border transition-all duration-200', pad && 'p-4 sm:p-5', variants[variant], className)} {...rest} />
}

/** A whole-card link with consistent hover/press behaviour. */
export function LinkCard({ to, className, children, variant = 'interactive' }: { to: string; className?: string; children: ReactNode; variant?: CardVariant }) {
  return (
    <Link to={to} className={cn('block rounded-xl border p-4 transition-all duration-200 sm:p-5', variants[variant], className)}>
      {children}
    </Link>
  )
}

export function SectionHeader({ title, to, action = 'See all', className }: { title: string; to?: string; action?: string; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
      {to && (
        <Link to={to} className="-mr-1 inline-flex min-h-11 items-center gap-0.5 px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-400">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

/** Row used for settings / profile menus. */
export function ListRow({ icon, title, detail, to, onClick, right, danger }: { icon?: ReactNode; title: string; detail?: string; to?: string; onClick?: () => void; right?: ReactNode; danger?: boolean }) {
  const inner = (
    <>
      {icon && <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-brand-300', danger && 'bg-danger/10 text-danger')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px] font-medium', danger && 'text-danger')}>{title}</span>
        {detail && <span className="block truncate text-[13px] text-faint">{detail}</span>}
      </span>
      {right ?? ((to || onClick) && <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />)}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-faint uppercase">{title}</h3>}
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">{children}</div>
    </section>
  )
}
