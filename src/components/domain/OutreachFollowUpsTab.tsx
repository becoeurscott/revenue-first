import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarPlus, Check } from 'lucide-react'
import { StatusBadge } from '@/components/domain/ProspectCard'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import type { Prospect } from '@/data/types'
import { timeAgo } from '@/lib/date'
import { useApp } from '@/store/useApp'

const DAY = 86_400_000

function Row({ prospect, meta, children }: { prospect: Prospect; meta: ReactNode; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <Link to={`/prospects/${prospect.id}`} className="flex items-center gap-3 rounded-md">
        <Avatar name={prospect.name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{prospect.name}</span>
          <span className="block truncate text-[13px] text-muted">{prospect.business}</span>
        </span>
        <StatusBadge status={prospect.status} />
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {meta}
        <div className="flex gap-2">{children}</div>
      </div>
    </li>
  )
}

export function OutreachFollowUpsTab() {
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const prospects = useApp((s) => s.prospects)
  const setFollowUp = useApp((s) => s.setFollowUp)

  const mine = prospects.filter((p) => p.path === pathId)
  const scheduled = mine.filter((p) => p.followUp).sort((a, b) => (a.followUp as string).localeCompare(b.followUp as string))
  const now = Date.now()
  const suggested = mine.filter((p) => p.status === 'Contacted' && !p.followUp && p.lastContact && now - new Date(p.lastContact).getTime() >= 3 * DAY)

  if (scheduled.length === 0 && suggested.length === 0) {
    return (
      <EmptyState
        mood="happy"
        title="No follow-ups due"
        description="You're all caught up. Set a follow-up from any prospect and it will show up here when it's time."
        action={<Button variant="secondary" onClick={() => navigate('/prospects')}>View prospects</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      {scheduled.length > 0 && (
        <section>
          <SectionHeader title="Scheduled" />
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {scheduled.map((p) => {
              const overdue = new Date(p.followUp as string).getTime() < now
              return (
                <Row
                  key={p.id}
                  prospect={p}
                  meta={
                    <Badge tone={overdue ? 'danger' : 'warning'} icon={<CalendarClock className="size-3" aria-hidden />}>
                      {overdue ? `Due ${timeAgo(p.followUp).toLowerCase()}` : timeAgo(p.followUp)}
                    </Badge>
                  }
                >
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/prospects/${p.id}`)}>Open</Button>
                  <Button
                    size="sm"
                    variant="success"
                    icon={<Check className="size-4" aria-hidden />}
                    onClick={() => {
                      setFollowUp(p.id, null)
                      toast.success(`Follow-up with ${p.name.split(' ')[0]} done`)
                    }}
                  >
                    Done
                  </Button>
                </Row>
              )
            })}
          </ul>
        </section>
      )}

      {suggested.length > 0 && (
        <section>
          <SectionHeader title="Suggested follow-ups" />
          <p className="-mt-2 mb-3 text-sm text-muted">Contacted 3+ days ago with no reply. A short bump often gets the answer.</p>
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {suggested.map((p) => (
              <Row key={p.id} prospect={p} meta={<span className="text-xs text-faint">Last contact: {timeAgo(p.lastContact)}</span>}>
                <Button
                  size="sm"
                  icon={<CalendarPlus className="size-4" aria-hidden />}
                  onClick={() => {
                    setFollowUp(p.id, 1)
                    toast.success(`Follow-up with ${p.name.split(' ')[0]} set for tomorrow`)
                  }}
                >
                  Set follow-up
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
