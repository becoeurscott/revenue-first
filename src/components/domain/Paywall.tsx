import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Crown, Lock } from 'lucide-react'
import { Mascot } from '@/components/mascot/Mascot'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { plans } from '@/data/subscription'
import type { Plan } from '@/data/types'
import { cn } from '@/lib/cn'
import { usePremium } from '@/store/selectors'
import { useApp } from '@/store/useApp'

export function PlanPicker({ value, onChange }: { value: Plan['id']; onChange: (id: Plan['id']) => void }) {
  return (
    <div role="radiogroup" aria-label="Choose a plan" className="grid grid-cols-2 gap-3">
      {plans.map((p) => {
        const on = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p.id)}
            className={cn('relative rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98]', on ? 'border-brand-500/60 bg-brand-500/12 shadow-glow-sm' : 'border-line bg-surface hover:border-line-strong')}
          >
            {p.badge && <Badge tone="success" className="absolute -top-3 right-3">{p.badge}</Badge>}
            <span className="flex items-center justify-between text-sm font-semibold text-muted">
              {p.name}
              <span className={cn('flex size-5 items-center justify-center rounded-full border', on ? 'bg-brand-gradient border-transparent text-white' : 'border-line-strong')}>{on && <Check className="size-3" aria-hidden />}</span>
            </span>
            <span className="tabular mt-2 block text-2xl font-extrabold tracking-tight">{p.price}</span>
            <span className="block text-xs text-faint">{p.period}</span>
            <span className="mt-2 block text-xs leading-snug text-muted">{p.note}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Simulated checkout. No payment is processed — this only flips local state. */
export function useMockCheckout(onDone?: () => void) {
  const subscribe = useApp((s) => s.subscribe)
  const [loading, setLoading] = useState(false)
  const start = (plan: Plan['id']) => {
    setLoading(true)
    setTimeout(() => {
      subscribe(plan)
      setLoading(false)
      onDone?.()
    }, 600)
  }
  return { loading, start }
}

export function PaywallSheet({ open, onClose, feature }: { open: boolean; onClose: () => void; feature: string }) {
  const [plan, setPlan] = useState<Plan['id']>('yearly')
  const navigate = useNavigate()
  const { loading, start } = useMockCheckout(() => {
    onClose()
    toast.success('Welcome to Premium 🎉')
    navigate('/subscription?state=success')
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Unlock with Premium"
      description={`${feature} is part of your complete FirstRevenue journey.`}
      footer={
        <>
          <Button full size="lg" loading={loading} onClick={() => start(plan)} icon={<Crown className="size-4.5" aria-hidden />}>
            Start Premium
          </Button>
          <p className="mt-2 text-center text-xs text-faint">Prototype checkout — no payment is taken.</p>
        </>
      }
    >
      <div className="flex justify-center pb-3"><Mascot mood="love" size={96} /></div>
      <PlanPicker value={plan} onChange={setPlan} />
    </Sheet>
  )
}

/** Locked feature state. Shown in place of premium content. */
export function LockedCard({ feature, description }: { feature: string; description?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-500/30 bg-brand-500/[0.05] px-6 py-10 text-center">
        <span className="bg-brand-gradient flex size-14 items-center justify-center rounded-full shadow-glow"><Lock className="size-6 text-white" aria-hidden /></span>
        <h3 className="mt-4 text-lg font-bold tracking-tight">{feature} is a Premium feature</h3>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{description ?? 'Upgrade to unlock your full 30-day program, the AI Coach and every tool.'}</p>
        <Button className="mt-5" onClick={() => setOpen(true)} icon={<Crown className="size-4" aria-hidden />}>Unlock Premium</Button>
      </div>
      <PaywallSheet open={open} onClose={() => setOpen(false)} feature={feature} />
    </>
  )
}

export function PremiumGate({ feature, description, children }: { feature: string; description?: string; children: ReactNode }) {
  const premium = usePremium()
  return premium ? <>{children}</> : <LockedCard feature={feature} description={description} />
}
