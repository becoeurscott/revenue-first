import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CornerDownLeft, PenLine, Send } from 'lucide-react'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { timeAgo } from '@/lib/date'
import { useApp } from '@/store/useApp'

/** Feed of every sent message and received reply across prospects, newest first. */
export function OutreachMessagesTab() {
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const prospects = useApp((s) => s.prospects)
  const loading = useFakeLoad(500)

  const feed = useMemo(
    () =>
      prospects
        .filter((p) => p.path === pathId)
        .flatMap((p) => p.history.filter((e) => e.kind === 'message' || e.kind === 'reply').map((e) => ({ event: e, prospect: p })))
        .sort((a, b) => b.event.date.localeCompare(a.event.date)),
    [prospects, pathId],
  )
  const sent = feed.filter((f) => f.event.kind === 'message').length
  const replies = feed.length - sent

  if (loading) return <ListSkeleton count={4} />
  if (feed.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Messages you mark as sent, and the replies you log, show up here as one timeline."
        action={<Button icon={<PenLine className="size-4" aria-hidden />} onClick={() => navigate('/outreach/generate')}>Write your first message</Button>}
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="tabular text-[13px] text-muted">
        <span className="font-semibold text-ink">{sent}</span> sent · <span className="font-semibold text-ink">{replies}</span> repl{replies === 1 ? 'y' : 'ies'}
        {sent > 0 && <> · {Math.round((replies / sent) * 100)}% reply rate</>}
      </p>
      <ul className="stagger space-y-3">
        {feed.map(({ event, prospect }) => {
          const reply = event.kind === 'reply'
          return (
            <li key={event.id}>
              <Link to={`/prospects/${prospect.id}`} className="block rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  <Avatar name={prospect.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{prospect.name}</p>
                    <p className="truncate text-xs text-faint">{prospect.business}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={reply ? 'success' : 'info'} icon={reply ? <CornerDownLeft className="size-3" aria-hidden /> : <Send className="size-3" aria-hidden />}>
                      {reply ? 'Reply' : 'Sent'}
                    </Badge>
                    <span className="tabular text-xs text-faint">{timeAgo(event.date)}</span>
                  </div>
                </div>
                <p className={`mt-3 line-clamp-3 rounded-md px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${reply ? 'bg-success/[0.07] text-ink-soft' : 'bg-bg-sunken text-muted'}`}>{event.text}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
