import { useEffect, useState } from 'react'
import type { Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { generatorOptions } from '@/data/messages'
import type { DealStatus } from '@/data/types'
import { cn, money } from '@/lib/cn'
import { useApp } from '@/store/useApp'

export const DEAL_STATUSES: DealStatus[] = ['Potential', 'Booked', 'Collected']
export const dealTone: Record<DealStatus, Tone> = { Potential: 'neutral', Booked: 'warning', Collected: 'success' }

const barStyle: Record<DealStatus, string> = {
  Potential: 'bg-surface-3 border border-line-strong',
  Booked: 'bg-warning/70',
  Collected: 'bg-brand-gradient shadow-glow-sm',
}
const barHint: Record<DealStatus, string> = { Potential: 'In conversation', Booked: 'Agreed, not paid', Collected: 'Money received' }

/** Three-bar pipeline chart built from plain divs. */
export function PipelineChart({ values, counts }: { values: Record<DealStatus, number>; counts: Record<DealStatus, number> }) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const max = Math.max(...DEAL_STATUSES.map((s) => values[s]), 1)
  return (
    <figure>
      <figcaption className="sr-only">Pipeline by stage: {DEAL_STATUSES.map((s) => `${s} ${money(values[s])} across ${counts[s]} deals`).join(', ')}.</figcaption>
      <div className="grid grid-cols-3 gap-3 sm:gap-6" aria-hidden>
        {DEAL_STATUSES.map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <span className="tabular mb-2 text-[15px] font-extrabold tracking-tight sm:text-lg">{money(values[s])}</span>
            <div className="flex h-36 w-full max-w-24 items-end rounded-md bg-bg-sunken">
              <div
                className={cn('w-full rounded-md', barStyle[s])}
                style={{ height: grown ? `${Math.max((values[s] / max) * 100, values[s] > 0 ? 6 : 2)}%` : '2%', transition: `height 0.9s var(--ease-out) ${i * 90}ms` }}
              />
            </div>
            <span className="mt-2.5 text-[13px] font-semibold">{s}</span>
            <span className="text-center text-[11px] leading-tight text-faint">{counts[s]} deal{counts[s] === 1 ? '' : 's'} · {barHint[s]}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function AddDealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathId = useApp((s) => s.pathId)
  const addDeal = useApp((s) => s.addDeal)
  const services = generatorOptions.services[pathId]
  const [client, setClient] = useState('')
  const [service, setService] = useState(services[0])
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<DealStatus>('Potential')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setClient('')
    setService(services[0])
    setAmount('')
    setStatus('Potential')
    setTouched(false)
  }, [open, services])

  const value = Math.round(Number(amount))
  const validAmount = Number.isFinite(value) && value > 0
  const submit = () => {
    setTouched(true)
    if (!client.trim() || !validAmount) return
    addDeal({ client: client.trim(), service, amount: value, status })
    onClose()
    toast.success(`${money(value)} deal added as ${status}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add deal" description="Track money from the first conversation to the payment." footer={<Button full onClick={submit}>Save deal</Button>}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <TextField label="Client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" autoComplete="off" error={touched && !client.trim() ? 'Add the client name' : undefined} />
        <SelectField label="Service" value={service} onChange={setService} options={services} />
        <TextField label="Amount ($)" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150" error={touched && !validAmount ? 'Enter an amount above $0' : undefined} />
        <SelectField label="Status" value={status} onChange={(v) => setStatus(v as DealStatus)} options={DEAL_STATUSES} />
        <button type="submit" className="sr-only" tabIndex={-1}>Save deal</button>
      </form>
    </Sheet>
  )
}
