import { create } from 'zustand'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'error' | 'info' | 'warning'
interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastStore {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

let counter = 0

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++counter
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative API: toast('Copied'), toast.error('…') */
export const toast = Object.assign((message: string) => useToastStore.getState().push(message, 'success'), {
  success: (m: string) => useToastStore.getState().push(m, 'success'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
  info: (m: string) => useToastStore.getState().push(m, 'info'),
  warning: (m: string) => useToastStore.getState().push(m, 'warning'),
})

const icons = {
  success: <CheckCircle2 className="size-5 text-success" aria-hidden />,
  error: <XCircle className="size-5 text-danger" aria-hidden />,
  info: <Info className="size-5 text-info" aria-hidden />,
  warning: <AlertTriangle className="size-5 text-warning" aria-hidden />,
}

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <div className="h-3" />
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn('pointer-events-auto flex max-w-sm animate-toast-in items-center gap-2.5 rounded-full border border-line-strong bg-surface-3/95 py-2.5 pr-5 pl-3.5 text-left text-sm font-medium shadow-card backdrop-blur')}
        >
          {icons[t.tone]}
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  )
}
