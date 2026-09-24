import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function StatCard({ icon, value, label, to, accent, className }: { icon?: ReactNode; value: ReactNode; label: string; to?: string; accent?: boolean; className?: string }) {
  const body = (
    <>
      {icon && <span className="mb-2 flex size-8 items-center justify-center rounded-sm bg-surface-3 text-base">{icon}</span>}
      <span className={cn('tabular block text-2xl leading-tight font-extrabold tracking-tight', accent && 'text-brand-gradient')}>{value}</span>
      <span className="mt-0.5 block text-[13px] text-muted">{label}</span>
    </>
  )
  const cls = cn('block rounded-lg border border-line bg-surface p-4 transition-all duration-200', to && 'hover:border-line-strong hover:bg-surface-2 active:scale-[0.98]', className)
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}
