import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/** Full-screen scaffold for signed-out screens. Centers a phone-width column on larger displays. */
export function AuthLayout({ children, back, footer }: { children: ReactNode; back?: string; footer?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-dvh justify-center overflow-hidden bg-bg">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="safe-top safe-bottom relative flex w-full max-w-md flex-col px-6">
        <div className="flex h-14 items-center">
          {back && (
            <button type="button" onClick={() => navigate(back)} aria-label="Go back" className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
          )}
        </div>
        <main className="flex flex-1 animate-fade-up flex-col">{children}</main>
        {footer && <div className="py-6">{footer}</div>}
      </div>
    </div>
  )
}
