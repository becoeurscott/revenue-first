import { useEffect, useState } from 'react'
import { Check, Download, Laptop, Smartphone, Tablet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { dayKey } from '@/lib/date'
import { useApp } from '@/store/useApp'

interface SheetState {
  open: boolean
  onClose: () => void
}

/** Generic single-choice sheet (language, reminder time, demo state…). */
export function OptionSheet<T extends string>({ open, onClose, title, description, options, value, onSelect }: SheetState & { title: string; description?: string; options: readonly { value: T; label?: string; hint?: string }[]; value: T | null; onSelect: (v: T) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}>
      <div role="radiogroup" aria-label={title} className="space-y-2 pb-1">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                onSelect(o.value)
                onClose()
              }}
              className={cn('flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all duration-200 active:scale-[0.99]', on ? 'border-brand-500/50 bg-brand-500/12' : 'border-line bg-surface hover:border-line-strong')}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{o.label ?? o.value}</span>
                {o.hint && <span className="block text-[13px] text-faint">{o.hint}</span>}
              </span>
              <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', on ? 'bg-brand-gradient border-transparent text-white' : 'border-line-strong')}>{on && <Check className="size-3" aria-hidden />}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

export function PasswordSheet({ open, onClose }: SheetState) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNext('')
    setConfirm('')
    setErrors({})
    setSaving(false)
  }, [open])

  const save = () => {
    const e: typeof errors = {}
    if (next.length < 8) e.next = 'Use at least 8 characters.'
    if (confirm !== next) e.confirm = 'Passwords do not match.'
    setErrors(e)
    if (e.next || e.confirm) return
    setSaving(true)
    window.setTimeout(() => {
      toast.success('Password updated (demo)')
      onClose()
    }, 700)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Change password" description="Demo only — nothing you type here is stored." footer={<Button full size="lg" loading={saving} onClick={save}>Update password</Button>}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <TextField label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} hint="At least 8 characters." autoComplete="new-password" />
        <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" />
        <button type="submit" className="sr-only" tabIndex={-1}>Update password</button>
      </form>
    </Sheet>
  )
}

/** Fictitious devices for the prototype. */
const seedSessions = [
  { id: 's-1', device: 'This device', detail: 'Web browser · Active now', Icon: Laptop, current: true },
  { id: 's-2', device: 'iPhone 15', detail: 'Austin, TX · 2 hours ago', Icon: Smartphone, current: false },
  { id: 's-3', device: 'iPad Air', detail: 'Austin, TX · 5 days ago', Icon: Tablet, current: false },
]

export function SessionsSheet({ open, onClose }: SheetState) {
  const [sessions, setSessions] = useState(seedSessions)
  const others = sessions.filter((s) => !s.current)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Active sessions"
      description="Devices currently signed in to your account. All fictitious."
      footer={
        <Button
          variant="danger"
          full
          disabled={others.length === 0}
          onClick={() => {
            setSessions((list) => list.filter((s) => s.current))
            toast.success('Signed out of all other devices (demo)')
          }}
        >
          Sign out of all other devices
        </Button>
      }
    >
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {sessions.map(({ id, device, detail, Icon, current }) => (
          <li key={id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-brand-300"><Icon className="size-5" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{device}</span>
              <span className="block truncate text-[13px] text-faint">{detail}</span>
            </span>
            {current ? (
              <Badge tone="success">Current</Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-11"
                onClick={() => {
                  setSessions((list) => list.filter((s) => s.id !== id))
                  toast.info(`Signed out of ${device} (demo)`)
                }}
              >
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function exportState() {
  try {
    const json = JSON.stringify(useApp.getState(), null, 2)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `firstrevenue-data-${dayKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Your data export is downloading')
  } catch {
    toast.error('Could not create the export. Try again.')
  }
}

export function DataSheet({ open, onClose }: SheetState) {
  const prospects = useApp((s) => s.prospects.length)
  const deals = useApp((s) => s.deals.length)
  const conversations = useApp((s) => s.conversations.length)
  return (
    <Sheet open={open} onClose={onClose} title="Your data" description="What FirstRevenue stores, and where." footer={<Button full size="lg" icon={<Download className="size-4.5" aria-hidden />} onClick={exportState}>Export my data</Button>}>
      <div className="space-y-3 pb-1 text-sm leading-relaxed text-muted">
        <p>Everything in this prototype is <strong className="font-semibold text-ink">fictitious</strong>. The prospects, clients, messages and payments are made-up examples.</p>
        <p>Anything you add is stored <strong className="font-semibold text-ink">locally in this browser</strong>. Nothing is sent to a server, and nobody else can see it.</p>
        <dl className="grid grid-cols-3 gap-2 pt-1 text-center">
          {[
            ['Prospects', prospects],
            ['Deals', deals],
            ['Coach chats', conversations],
          ].map(([label, n]) => (
            <div key={label} className="rounded-lg border border-line bg-surface px-2 py-3">
              <dd className="tabular text-xl font-extrabold tracking-tight text-ink">{n}</dd>
              <dt className="text-xs text-faint">{label}</dt>
            </div>
          ))}
        </dl>
        <p className="text-[13px] text-faint">The export is a JSON file with your profile, progress, prospects, deals and settings.</p>
      </div>
    </Sheet>
  )
}
