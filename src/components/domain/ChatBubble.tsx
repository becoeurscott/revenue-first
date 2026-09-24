import { RotateCcw, Sparkles, WifiOff } from 'lucide-react'
import type { ChatMessage } from '@/data/types'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/date'

export function CoachAvatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-sm', className)}>
      <Sparkles className="size-4" />
    </span>
  )
}

export function ChatBubble({ from, text, date }: Pick<ChatMessage, 'from' | 'text'> & { date?: string }) {
  const user = from === 'user'
  return (
    <div className={cn('flex animate-fade-up items-end gap-2', user ? 'justify-end' : 'justify-start')}>
      {!user && <CoachAvatar />}
      <div className={cn('flex max-w-[85%] flex-col sm:max-w-[75%]', user ? 'items-end' : 'items-start')}>
        <span className="sr-only">{user ? 'You said:' : 'Coach said:'}</span>
        <div
          className={cn(
            'px-4 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap',
            user ? 'rounded-xl rounded-br-sm bg-brand-gradient text-white shadow-glow-sm' : 'rounded-xl rounded-bl-sm border border-line bg-surface text-ink-soft',
          )}
        >
          {text}
        </div>
        {date && <time dateTime={date} className="tabular mt-1 px-1 text-[11px] text-faint">{formatTime(date)}</time>}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex animate-fade-in items-end gap-2" role="status" aria-label="Coach is typing">
      <CoachAvatar />
      <div className="flex h-11 items-center gap-1.5 rounded-xl rounded-bl-sm border border-line bg-surface px-4">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-typing rounded-full bg-brand-300" style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  )
}

/** Inline failure bubble shown in place of a coach reply (offline / request failed). */
export function ErrorBubble({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex animate-fade-up items-end gap-2" role="alert">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/12 text-danger">
        <WifiOff className="size-4" />
      </span>
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-danger/25 bg-danger/[0.08] px-4 py-3 sm:max-w-[75%]">
        <p className="text-[15px] font-semibold text-ink">Couldn't reach your coach</p>
        <p className="mt-0.5 text-sm text-muted">You seem to be offline. Your message is saved. Try again when you're back.</p>
        <button type="button" onClick={onRetry} className="mt-2 -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-danger hover:bg-danger/10">
          <RotateCcw className="size-4" aria-hidden /> Retry
        </button>
      </div>
    </div>
  )
}
