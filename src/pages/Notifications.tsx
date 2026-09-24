import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { NotificationItem } from '@/components/domain/NotificationItem'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Button } from '@/components/ui/Button'
import { FilterChips } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toast'
import type { AppNotification } from '@/data/types'
import { dayKey } from '@/lib/date'
import { useUnreadCount } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const FILTERS = ['All', 'Unread'] as const
type Filter = (typeof FILTERS)[number]

function Group({ title, items }: { title: string; items: AppNotification[] }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-faint uppercase">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </section>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const notifications = useApp((s) => s.notifications)
  const markAll = useApp((s) => s.markAllNotificationsRead)
  const unread = useUnreadCount()
  const [filter, setFilter] = useState<Filter>('All')
  const loading = useFakeLoad(350)

  const { today, earlier } = useMemo(() => {
    const list = [...notifications].filter((n) => filter === 'All' || !n.read).sort((a, b) => b.date.localeCompare(a.date))
    const key = dayKey()
    return { today: list.filter((n) => dayKey(n.date) === key), earlier: list.filter((n) => dayKey(n.date) !== key) }
  }, [notifications, filter])

  const empty = today.length + earlier.length === 0

  return (
    <Page
      title="Notifications"
      back
      actions={
        <Button
          variant="ghost"
          size="sm"
          disabled={unread === 0}
          icon={<CheckCheck className="size-4" aria-hidden />}
          onClick={() => {
            markAll()
            toast.success('All notifications marked as read')
          }}
        >
          Mark all as read
        </Button>
      }
    >
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter notifications" counts={{ All: notifications.length, Unread: unread }} />

      <div className="mt-5 pb-6">
        {loading ? (
          <ListSkeleton count={5} />
        ) : empty && filter === 'Unread' && notifications.length > 0 ? (
          <EmptyState mood="happy" title="You're all caught up" description="No unread notifications. Go make some progress and we'll have news for you soon." action={<Button variant="secondary" onClick={() => setFilter('All')}>View all</Button>} />
        ) : empty ? (
          <EmptyState mood="sleepy" title="No notifications" description="Mission reminders, replies from prospects and milestones will show up here." action={<Button onClick={() => navigate('/home')}>Go to today's mission</Button>} />
        ) : (
          <div className="animate-fade-up space-y-6">
            <Group title="Today" items={today} />
            <Group title="Earlier" items={earlier} />
          </div>
        )}
      </div>
    </Page>
  )
}
