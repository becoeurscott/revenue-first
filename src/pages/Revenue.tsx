import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Plus, Target, Users } from 'lucide-react'
import { AddDealSheet, DEAL_STATUSES, PipelineChart, dealTone } from '@/components/domain/RevenueParts'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Page } from '@/components/layout/Page'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { FilterChips } from '@/components/ui/Chips'
import { Confetti } from '@/components/ui/Confetti'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { Sheet } from '@/components/ui/Sheet'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from '@/components/ui/Toast'
import type { DealStatus } from '@/data/types'
import { money } from '@/lib/cn'
import { timeAgo } from '@/lib/date'
import { useStats } from '@/store/selectors'
import { useApp } from '@/store/useApp'

type Filter = 'All' | DealStatus
const FILTERS: readonly Filter[] = ['All', ...DEAL_STATUSES]

export default function Revenue() {
  const navigate = useNavigate()
  const stats = useStats()
  const deals = useApp((s) => s.deals)
  const goal = useApp((s) => s.user.goalAmount) || 500
  const setDealStatus = useApp((s) => s.setDealStatus)
  const loading = useFakeLoad(450)
  const [filter, setFilter] = useState<Filter>('All')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!celebrate) return
    const timer = window.setTimeout(() => setCelebrate(false), 2000)
    return () => window.clearTimeout(timer)
  }, [celebrate])

  const sorted = useMemo(() => [...deals].sort((a, b) => b.date.localeCompare(a.date)), [deals])
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: deals.length, Potential: 0, Booked: 0, Collected: 0 }
    for (const d of deals) c[d.status]++
    return c
  }, [deals])
  const visible = sorted.filter((d) => filter === 'All' || d.status === filter)
  const active = deals.find((d) => d.id === openId)
  const hasProspect = useApp((s) => !!active?.prospectId && s.prospects.some((p) => p.id === active.prospectId))

  const pct = Math.round((stats.revenue / goal) * 100)
  const remaining = Math.max(goal - stats.revenue, 0)

  const move = (status: DealStatus) => {
    if (!active) return
    setDealStatus(active.id, status)
    setOpenId(null)
    if (status === 'Collected') {
      setCelebrate(true)
      toast.success(`${money(active.amount)} collected from ${active.client}!`)
    } else {
      toast.success(`${active.client} marked as ${status}`)
    }
  }

  return (
    <Page
      title="Revenue"
      subtitle="Every dollar, from first chat to paid."
      large
      actions={
        <IconButton label="Add deal" onClick={() => setAdding(true)}>
          <Plus className="size-5" aria-hidden />
        </IconButton>
      }
    >
      {celebrate && <Confetti />}

      {deals.length === 0 && !loading ? (
        <EmptyState
          title="No revenue yet"
          description="Your first deal starts with a conversation. Mark a prospect as Interested and it shows up here automatically."
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button iconRight={<ArrowRight className="size-4" aria-hidden />} onClick={() => navigate('/prospects')}>Go to prospects</Button>
              <Button variant="secondary" onClick={() => setAdding(true)}>Add a deal manually</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card variant="hero" className="flex flex-col justify-between">
              <div>
                <p className="text-[13px] font-semibold tracking-wide text-brand-300 uppercase">Collected</p>
                <p className="tabular mt-1 text-5xl leading-tight font-extrabold tracking-tight text-brand-gradient">{money(stats.revenue)}</p>
              </div>
              <div className="mt-5">
                <ProgressBar value={stats.revenue / goal} label={`Progress toward your first ${money(goal)}`} className="h-2.5" />
                <p className="tabular mt-2 flex items-center justify-between gap-3 text-[13px] text-muted">
                  <span><span className="font-semibold text-ink">{pct}%</span> of your first {money(goal)}</span>
                  <span>{remaining > 0 ? `${money(remaining)} to go` : 'Goal reached'}</span>
                </p>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <StatCard value={money(stats.potential)} label="Potential" />
              <StatCard value={money(stats.booked)} label="Booked" />
              <StatCard icon={<Users className="size-4 text-brand-300" aria-hidden />} value={stats.clients} label="Clients" to="/prospects" />
              <StatCard icon={<Target className="size-4 text-brand-300" aria-hidden />} value={`${stats.conversion}%`} label="Conversion rate" />
            </div>
          </div>

          <section>
            <SectionHeader title="Pipeline" />
            <Card>
              <PipelineChart
                values={{ Potential: stats.potential, Booked: stats.booked, Collected: stats.revenue }}
                counts={{ Potential: counts.Potential, Booked: counts.Booked, Collected: counts.Collected }}
              />
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-tight">Recent deals</h2>
              <Button size="sm" variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setAdding(true)}>Add deal</Button>
            </div>
            <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter deals by status" counts={counts} />
            <div className="mt-3">
              {loading ? (
                <ListSkeleton count={3} />
              ) : visible.length === 0 ? (
                <EmptyState compact mood="thinking" title={`No ${filter.toLowerCase()} deals`} description="Deals move here as you update their status." action={<Button variant="secondary" onClick={() => setFilter('All')}>Show all deals</Button>} />
              ) : (
                <ul className="stagger grid gap-3 sm:grid-cols-2">
                  {visible.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => setOpenId(d.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                        <Avatar name={d.client} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{d.client}</span>
                          <span className="block truncate text-[13px] text-muted">{d.service}</span>
                          <span className="tabular mt-0.5 block text-xs text-faint">{timeAgo(d.date)}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="tabular text-[17px] font-extrabold tracking-tight">{money(d.amount)}</span>
                          <Badge tone={dealTone[d.status]}>{d.status}</Badge>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      <Sheet open={!!active} onClose={() => setOpenId(null)} title={active?.client ?? 'Deal'} description={active?.service}>
        {active && (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3 rounded-lg border border-line bg-surface p-4">
              <div>
                <p className="text-[13px] text-muted">Amount</p>
                <p className="tabular text-3xl font-extrabold tracking-tight">{money(active.amount)}</p>
              </div>
              <div className="text-right">
                <Badge tone={dealTone[active.status]}>{active.status}</Badge>
                <p className="tabular mt-1.5 text-xs text-faint">Updated {timeAgo(active.date).toLowerCase()}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {active.status === 'Potential' && <Button full variant="secondary" onClick={() => move('Booked')}>Mark Booked</Button>}
              {active.status !== 'Collected' && <Button full variant="success" icon={<Check className="size-4" aria-hidden />} onClick={() => move('Collected')}>Mark Collected</Button>}
              {active.status === 'Collected' && <p className="rounded-md bg-success/10 px-3 py-2.5 text-center text-sm font-medium text-success">Paid in full. Nice work.</p>}
              {active.status === 'Booked' && <Button full variant="ghost" onClick={() => move('Potential')}>Move back to Potential</Button>}
            </div>
            {hasProspect && (
              <Link to={`/prospects/${active.prospectId}`} className="flex min-h-11 items-center justify-center gap-1 text-[13px] font-semibold text-brand-300 hover:text-brand-400">
                View prospect <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </Sheet>

      <AddDealSheet open={adding} onClose={() => setAdding(false)} />
    </Page>
  )
}
