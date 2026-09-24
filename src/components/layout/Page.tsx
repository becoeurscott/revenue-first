import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PageProps {
  title: string
  subtitle?: string
  /** true → history back; string → explicit parent route */
  back?: boolean | string
  actions?: ReactNode
  children: ReactNode
  /** large iOS-style title (top-level tabs) vs compact (detail screens) */
  large?: boolean
  eyebrow?: string
  className?: string
}

/** Standard screen scaffold: sticky top bar + title block + content. */
export function Page({ title, subtitle, back, actions, children, large, eyebrow, className }: PageProps) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'string') navigate(back)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }
  return (
    <div className={className}>
      <header className={cn('safe-top sticky top-0 z-20 -mx-4 bg-bg/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10', !large && 'border-b border-line')}>
        <div className="flex min-h-14 items-center gap-2 py-1.5">
          {back && (
            <button type="button" onClick={goBack} aria-label="Go back" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 active:scale-95">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
          )}
          {!large && <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-tight">{title}</h1>}
          {large && <span className="flex-1" />}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>
      {large && (
        <div className="pt-1 pb-5">
          {eyebrow && <p className="mb-1 text-[13px] font-semibold tracking-wide text-brand-300 uppercase">{eyebrow}</p>}
          <h1 className="text-[32px] leading-[1.1] font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
      )}
      {!large && subtitle && <p className="pt-4 text-[15px] text-muted">{subtitle}</p>}
      <div className={cn(!large && 'pt-5')}>{children}</div>
    </div>
  )
}
