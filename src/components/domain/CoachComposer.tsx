import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Chat input pinned to the bottom of the viewport. Portalled to <body> so that
 * animated (transformed) page wrappers don't capture `position: fixed`.
 * Sits above the mobile bottom nav (64px + safe area); on lg it clears the sidebar.
 */
export function CoachComposer({ onSend, disabled, placeholder = 'Ask your coach anything…' }: { onSend: (text: string) => void; disabled?: boolean; placeholder?: string }) {
  const [text, setText] = useState('')
  const value = text.trim()
  const submit = () => {
    if (!value || disabled) return
    onSend(value)
    setText('')
  }
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-bg/90 backdrop-blur-xl lg:bottom-0 lg:left-64">
      <form
        className="mx-auto flex w-full max-w-5xl items-end gap-2 px-4 py-3 sm:px-6 lg:px-10 lg:py-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="coach-input" className="sr-only">Message your coach</label>
        <textarea
          id="coach-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[15px] leading-6 text-ink [field-sizing:content] placeholder:text-faint hover:border-line-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!value || disabled}
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-sm transition-all duration-200 hover:brightness-110 active:scale-95',
            'disabled:bg-none disabled:bg-surface-3 disabled:text-faint disabled:shadow-none',
          )}
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>,
    document.body,
  )
}
