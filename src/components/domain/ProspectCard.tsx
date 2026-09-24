import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { Avatar, Badge, type Tone } from '@/components/ui/Badge'
import type { Prospect, ProspectStatus } from '@/data/types'
import { money } from '@/lib/cn'
import { timeAgo } from '@/lib/date'

export const PROSPECT_STATUSES: ProspectStatus[] = ['New', 'Contacted', 'Replied', 'Interested', 'Negotiating', 'Won', 'Lost']

export const statusTone: Record<ProspectStatus, Tone> = {
  New: 'neutral',
  Contacted: 'info',
  Replied: 'brand',
  Interested: 'warning',
  Negotiating: 'warning',
  Won: 'success',
  Lost: 'danger',
}

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}

export function ProspectCard({ prospect }: { prospect: Prospect }) {
  return (
    <Link to={`/prospects/${prospect.id}`} className="block rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <Avatar name={prospect.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold">{prospect.name}</h3>
            <StatusBadge status={prospect.status} />
          </div>
          <p className="truncate text-[13px] text-muted">{prospect.business}</p>
          <p className="mt-0.5 truncate text-xs text-faint">{prospect.platform} · {prospect.audience}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          {prospect.followUp ? (<><CalendarClock className="size-3.5 text-warning" aria-hidden /> Follow-up {timeAgo(prospect.followUp).toLowerCase()}</>) : (<>Last contact: {timeAgo(prospect.lastContact)}</>)}
        </span>
        <span className="tabular text-sm font-bold text-ink">{money(prospect.value)}</span>
      </div>
    </Link>
  )
}
