import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarClock, CalendarPlus, ChevronDown, Check, Heart, MoreHorizontal, Send, StickyNote, ThumbsDown, Trash2, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { PROSPECT_STATUSES, StatusBadge } from '@/components/domain/ProspectCard'
import { ContactTimeline, ProfileAuditCard } from '@/components/domain/ProspectSections'
import { Page } from '@/components/layout/Page'
import { Avatar } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, ListGroup, ListRow, SectionHeader } from '@/components/ui/Card'
import { Confetti } from '@/components/ui/Confetti'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextArea } from '@/components/ui/Inputs'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import type { ProspectStatus } from '@/data/types'
import { cn, money } from '@/lib/cn'
import { formatDate, timeAgo } from '@/lib/date'
import { useApp } from '@/store/useApp'

type Overlay = null | 'note' | 'followup' | 'status' | 'won' | 'lost' | 'more' | 'remove'

const FOLLOW_UP_OPTIONS: { label: string; days: number }[] = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
]

function ActionTile({ icon, label, onClick, tone = 'default', disabled }: { icon: ReactNode; label: string; onClick: () => void; tone?: 'default' | 'primary' | 'success' | 'danger'; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-lg border p-3.5 text-left text-[13px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
        tone === 'default' && 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-2',
        tone === 'primary' && 'border-transparent bg-brand-gradient text-white shadow-glow-sm hover:brightness-110',
        tone === 'success' && 'border-success/25 bg-success/10 text-success hover:bg-success/15',
        tone === 'danger' && 'border-danger/25 bg-danger/[0.08] text-danger hover:bg-danger/15',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export default function ProspectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const prospect = useApp((s) => s.prospects.find((p) => p.id === id))
  const setProspectStatus = useApp((s) => s.setProspectStatus)
  const addProspectNote = useApp((s) => s.addProspectNote)
  const setFollowUp = useApp((s) => s.setFollowUp)
  const removeProspect = useApp((s) => s.removeProspect)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [note, setNote] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!celebrate) return
    const timer = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(timer)
  }, [celebrate])

  if (!prospect) {
    return (
      <Page title="Prospect" back="/prospects">
        <EmptyState mood="sad" title="Prospect not found" description="This prospect may have been removed from your list." action={<Button onClick={() => navigate('/prospects')}>Back to prospects</Button>} />
      </Page>
    )
  }

  const first = prospect.name.split(' ')[0]
  const close = () => setOverlay(null)
  const changeStatus = (status: ProspectStatus) => {
    close()
    if (status === prospect.status) return
    if (status === 'Won') return setOverlay('won')
    if (status === 'Lost') return setOverlay('lost')
    setProspectStatus(prospect.id, status)
    toast.success(`${first} marked as ${status}`)
  }
  const saveNote = () => {
    if (!note.trim()) return
    addProspectNote(prospect.id, note.trim())
    setNote('')
    close()
    toast.success('Note saved')
  }
  const scheduleFollowUp = (days: number | null) => {
    setFollowUp(prospect.id, days)
    close()
    toast.success(days === null ? 'Follow-up cleared' : `Follow-up set for ${days === 1 ? 'tomorrow' : `${days} days from now`}`)
  }

  return (
    <Page
      title={prospect.name}
      back="/prospects"
      actions={
        <IconButton label="More options" onClick={() => setOverlay('more')}>
          <MoreHorizontal className="size-5" aria-hidden />
        </IconButton>
      }
    >
      {celebrate && <Confetti />}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-6">
          <Card variant="hero">
            <div className="flex items-start gap-4">
              <Avatar name={prospect.name} size={60} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold tracking-tight">{prospect.name}</h2>
                <p className="truncate text-[15px] text-muted">{prospect.business}</p>
                <p className="mt-1 truncate text-[13px] text-faint">{prospect.platform} · {prospect.audience}</p>
                {prospect.handle && <p className="truncate text-[13px] text-brand-300">{prospect.handle}</p>}
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
              <div>
                <p className="text-[13px] text-muted">Potential deal value</p>
                <p className="tabular text-3xl font-extrabold tracking-tight text-brand-gradient">{money(prospect.value)}</p>
              </div>
              <button type="button" onClick={() => setOverlay('status')} aria-label={`Status: ${prospect.status}. Change status`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full pl-1 text-muted hover:text-ink">
                <StatusBadge status={prospect.status} />
                <ChevronDown className="size-4" aria-hidden />
              </button>
            </div>
            {prospect.followUp && (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-[13px] font-medium text-warning">
                <CalendarClock className="size-4 shrink-0" aria-hidden /> Follow-up: {timeAgo(prospect.followUp).toLowerCase()} · {formatDate(prospect.followUp)}
              </p>
            )}
          </Card>

          <section aria-label="Actions" className="grid grid-cols-3 gap-2.5">
            <ActionTile tone="primary" icon={<Send className="size-5" aria-hidden />} label="Send Message" onClick={() => navigate(`/outreach/generate?prospect=${prospect.id}`)} />
            <ActionTile icon={<StickyNote className="size-5 text-brand-300" aria-hidden />} label="Add Note" onClick={() => setOverlay('note')} />
            <ActionTile icon={<CalendarPlus className="size-5 text-brand-300" aria-hidden />} label="Set Follow-up" onClick={() => setOverlay('followup')} />
            <ActionTile icon={<Heart className="size-5 text-warning" aria-hidden />} label="Mark Interested" disabled={prospect.status === 'Interested'} onClick={() => changeStatus('Interested')} />
            <ActionTile tone="success" icon={<Trophy className="size-5" aria-hidden />} label="Mark Won" disabled={prospect.status === 'Won'} onClick={() => setOverlay('won')} />
            <ActionTile tone="danger" icon={<ThumbsDown className="size-5" aria-hidden />} label="Mark Lost" disabled={prospect.status === 'Lost'} onClick={() => setOverlay('lost')} />
          </section>

          {prospect.about && (
            <section>
              <SectionHeader title="About" />
              <Card><p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">{prospect.about}</p></Card>
            </section>
          )}

          {prospect.gbp && (
            <section>
              <SectionHeader title="Profile audit" />
              <ProfileAuditCard audit={prospect.gbp} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-tight">Notes</h2>
              <button type="button" onClick={() => setOverlay('note')} className="-mr-1 inline-flex min-h-11 items-center px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-400">Add note</button>
            </div>
            {prospect.notes.length === 0 ? (
              <EmptyState compact mood="thinking" title="No notes yet" description={`Jot down what you noticed about ${first}. Details make your messages personal.`} action={<Button size="sm" variant="secondary" onClick={() => setOverlay('note')}>Add a note</Button>} />
            ) : (
              <ul className="stagger space-y-2.5">
                {prospect.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-line bg-surface p-3.5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{n.text}</p>
                    <time dateTime={n.date} className="tabular mt-1.5 block text-xs text-faint">{timeAgo(n.date)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader title="Contact history" />
            <ContactTimeline events={prospect.history} />
          </section>
        </div>
      </div>

      <Sheet open={overlay === 'note'} onClose={close} title="Add note" description={`Only you can see notes about ${first}.`} footer={<Button full disabled={!note.trim()} onClick={saveNote}>Save note</Button>}>
        <TextArea label="Note" rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Posts a 90-min podcast every Tuesday, no Shorts yet." autoFocus />
      </Sheet>

      <Sheet open={overlay === 'followup'} onClose={close} title="Set follow-up" description="We'll list it in Follow-ups when it's due.">
        <ListGroup>
          {FOLLOW_UP_OPTIONS.map((o) => (
            <ListRow key={o.days} icon={<CalendarPlus className="size-4.5" aria-hidden />} title={o.label} onClick={() => scheduleFollowUp(o.days)} />
          ))}
          {prospect.followUp && <ListRow danger icon={<Trash2 className="size-4.5" aria-hidden />} title="Clear follow-up" onClick={() => scheduleFollowUp(null)} />}
        </ListGroup>
      </Sheet>

      <Sheet open={overlay === 'status'} onClose={close} title="Update status" description="Move this prospect through your pipeline.">
        <ol className="space-y-2">
          {PROSPECT_STATUSES.map((s, i) => {
            const current = s === prospect.status
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => changeStatus(s)}
                  aria-current={current ? 'step' : undefined}
                  className={cn('flex min-h-13 w-full items-center gap-3 rounded-lg border px-4 text-left transition-all duration-200 active:scale-[0.99]', current ? 'border-brand-500/50 bg-brand-500/12' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2')}
                >
                  <span className={cn('tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', current ? 'bg-brand-gradient text-white' : 'bg-surface-3 text-muted')}>{i + 1}</span>
                  <span className="flex-1 text-[15px] font-semibold">{s}</span>
                  {current ? <Check className="size-5 text-brand-300" aria-hidden /> : <StatusBadge status={s} />}
                </button>
              </li>
            )
          })}
        </ol>
      </Sheet>

      <Sheet open={overlay === 'more'} onClose={close} title="More options">
        <ListGroup>
          <ListRow icon={<ChevronDown className="size-4.5" aria-hidden />} title="Change status" detail={`Currently ${prospect.status}`} onClick={() => setOverlay('status')} />
          <ListRow danger icon={<Trash2 className="size-4.5" aria-hidden />} title="Remove prospect" onClick={() => setOverlay('remove')} />
        </ListGroup>
      </Sheet>

      <ConfirmDialog
        open={overlay === 'won'}
        onClose={close}
        onConfirm={() => {
          setProspectStatus(prospect.id, 'Won')
          setCelebrate(true)
          toast.success('Client won! Deal added to revenue')
        }}
        title={`Did you win ${first}?`}
        description={`We'll mark ${prospect.business} as Won and book ${money(prospect.value)} in your revenue tracker.`}
        confirmLabel="Yes, I won it"
        variant="success"
      />
      <ConfirmDialog
        open={overlay === 'lost'}
        onClose={close}
        onConfirm={() => {
          setProspectStatus(prospect.id, 'Lost')
          toast.info(`${first} marked as Lost. On to the next one.`)
        }}
        title="Mark as lost?"
        description="Any open potential deal for this prospect is removed from your pipeline. You can change the status again later."
        confirmLabel="Mark Lost"
        variant="danger"
      />
      <ConfirmDialog
        open={overlay === 'remove'}
        onClose={close}
        onConfirm={() => {
          removeProspect(prospect.id)
          toast('Prospect removed')
          navigate('/prospects')
        }}
        title="Remove this prospect?"
        description={`${prospect.name} and all notes and history will be deleted. This can't be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />

      {prospect.status === 'Won' && (
        <p className="mt-6 text-center text-sm text-muted">
          Deal booked. <Link to="/revenue" className="font-semibold text-brand-300 hover:text-brand-400">Track the payment in Revenue</Link>
        </p>
      )}
    </Page>
  )
}
