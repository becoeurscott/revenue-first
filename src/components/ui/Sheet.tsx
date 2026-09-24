import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, type ButtonVariant } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** hide the close button (for forced flows) */
  dismissible?: boolean
}

/**
 * Responsive overlay: a bottom sheet on phones, a centered modal on larger screens.
 * Handles Escape, focus restore, scroll lock and backdrop dismissal.
 */
export function Sheet({ open, onClose, title, description, children, footer, dismissible = true }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
      if (e.key === 'Tab' && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose, dismissible])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-bg-sunken shadow-sheet outline-none',
          'animate-sheet-up rounded-t-2xl sm:max-w-md sm:animate-scale-in sm:rounded-2xl',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 px-5 pt-4 pb-2 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {dismissible && (
            <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
              <X className="size-5" aria-hidden />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-3">{children}</div>
        {footer && <footer className="safe-bottom border-t border-line px-5 pt-3"><div className="pb-4">{footer}</div></footer>}
        {!footer && <div className="safe-bottom"><div className="h-4" /></div>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel: string
  variant?: ButtonVariant
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, variant = 'primary' }: ConfirmProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" full onClick={onClose}>Cancel</Button>
          <Button
            variant={variant}
            full
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <span className="sr-only">{description}</span>
    </Sheet>
  )
}
