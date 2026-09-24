import { useNavigate } from 'react-router-dom'
import { Mail, MailOpen } from 'lucide-react'
import type { AppNotification } from '@/data/types'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/date'
import { useApp } from '@/store/useApp'

/** One notification row: tap to open (marks read), side button toggles read state. */
export function NotificationItem({ notification: n }: { notification: AppNotification }) {
  const navigate = useNavigate()
  const toggle = useApp((s) => s.toggleNotificationRead)
  const unread = !n.read

  const open = () => {
    if (unread) toggle(n.id)
    navigate(n.link)
  }

  return (
    <div className={cn('relative flex items-stretch transition-colors', unread ? 'bg-brand-500/[0.06]' : 'bg-surface')}>
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pr-1 pl-4 text-left transition-colors hover:bg-surface-2">
        <span className="relative shrink-0">
          <span className={cn('flex size-11 items-center justify-center rounded-full text-xl', unread ? 'bg-brand-500/15' : 'bg-surface-3')} aria-hidden>
            {n.emoji}
          </span>
          {unread && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-bg bg-brand-400" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('min-w-0 text-[15px] leading-snug', unread ? 'font-bold text-ink' : 'font-medium text-ink-soft')}>
              {unread && <span className="sr-only">Unread: </span>}
              {n.title}
            </span>
            <span className="tabular shrink-0 text-xs text-faint">{timeAgo(n.date)}</span>
          </span>
          <span className={cn('mt-0.5 line-clamp-2 block text-[13px] leading-relaxed', unread ? 'text-muted' : 'text-faint')}>{n.body}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggle(n.id)}
        aria-label={unread ? `Mark "${n.title}" as read` : `Mark "${n.title}" as unread`}
        title={unread ? 'Mark as read' : 'Mark as unread'}
        className="flex w-12 shrink-0 items-center justify-center text-faint transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {unread ? <MailOpen className="size-4.5" aria-hidden /> : <Mail className="size-4.5" aria-hidden />}
      </button>
    </div>
  )
}
