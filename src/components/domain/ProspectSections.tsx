import { AlertTriangle, ArrowRightLeft, CalendarClock, CornerDownLeft, MapPin, Phone, Send, Star, StickyNote, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import type { ContactEvent, GbpAudit } from '@/data/types'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/date'

/** Google Business Profile audit summary for gbp-path prospects. */
export function ProfileAuditCard({ audit }: { audit: GbpAudit }) {
  const full = Math.round(audit.rating)
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="tabular text-2xl font-extrabold tracking-tight">{audit.rating.toFixed(1)}</span>
            <span className="flex" role="img" aria-label={`Rated ${audit.rating.toFixed(1)} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('size-4', n <= full ? 'fill-warning text-warning' : 'text-faint')} aria-hidden />
              ))}
            </span>
          </div>
          <p className="tabular mt-0.5 text-[13px] text-muted">{audit.reviews.toLocaleString('en-US')} reviews</p>
        </div>
        <div className="text-right text-[13px] text-muted">
          <p className="font-semibold text-ink-soft">{audit.category}</p>
          <p className="mt-0.5 inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {audit.city}</p>
        </div>
      </div>

      <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-faint uppercase">Problems found</h3>
      <ul className="space-y-2">
        {audit.problems.map((problem) => (
          <li key={problem} className="flex items-start gap-2.5 rounded-md bg-warning/[0.07] px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {problem}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-brand-500/25 bg-brand-500/10 p-3">
        <Wrench className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
        <p className="text-sm leading-relaxed">
          <span className="block text-xs font-semibold text-brand-300">Suggested service</span>
          {audit.service}
        </p>
      </div>
    </Card>
  )
}

const kindIcon: Record<ContactEvent['kind'], { icon: ReactNode; cls: string; label: string }> = {
  message: { icon: <Send className="size-3.5" aria-hidden />, cls: 'bg-info/12 text-info', label: 'Message sent' },
  reply: { icon: <CornerDownLeft className="size-3.5" aria-hidden />, cls: 'bg-success/12 text-success', label: 'Reply received' },
  call: { icon: <Phone className="size-3.5" aria-hidden />, cls: 'bg-brand-500/15 text-brand-300', label: 'Call' },
  status: { icon: <ArrowRightLeft className="size-3.5" aria-hidden />, cls: 'bg-surface-3 text-muted', label: 'Status' },
  note: { icon: <StickyNote className="size-3.5" aria-hidden />, cls: 'bg-surface-3 text-muted', label: 'Note' },
  followup: { icon: <CalendarClock className="size-3.5" aria-hidden />, cls: 'bg-warning/12 text-warning', label: 'Follow-up' },
}

export function ContactTimeline({ events }: { events: ContactEvent[] }) {
  if (events.length === 0) return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No contact yet. Send the first message to start the timeline.</p>
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
      {events.map((e) => {
        const k = kindIcon[e.kind]
        const quoted = e.kind === 'message' || e.kind === 'reply'
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={cn('z-[1] flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-bg', k.cls)}>{k.icon}</span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="flex items-baseline justify-between gap-3 text-xs text-faint">
                <span className="font-semibold text-muted">{k.label}</span>
                <time dateTime={e.date} className="tabular shrink-0">{timeAgo(e.date)}</time>
              </p>
              <p className={cn('mt-1 text-sm leading-relaxed whitespace-pre-wrap', quoted ? 'rounded-md border border-line bg-surface px-3 py-2.5 text-ink-soft' : 'text-ink-soft')}>{e.text}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
