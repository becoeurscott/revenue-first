import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarClock, Crown, Repeat } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Mascot } from '@/components/mascot/Mascot'
import { PlanPicker, useMockCheckout } from '@/components/domain/Paywall'
import { BenefitsList, LegalLinks, RestoreButton } from '@/components/domain/SubscriptionParts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Confetti } from '@/components/ui/Confetti'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { plans } from '@/data/subscription'
import type { Plan } from '@/data/types'
import { formatDate } from '@/lib/date'
import { useApp } from '@/store/useApp'

/** Plan picker + primary CTA with simulated checkout (respects the offline demo switch). */
function Checkout({ cta }: { cta: string }) {
  const navigate = useNavigate()
  const offline = useApp((s) => s.settings.offline)
  const [plan, setPlan] = useState<Plan['id']>('yearly')
  const { loading, start } = useMockCheckout(() => navigate('/subscription?state=success', { replace: true }))
  const selected = plans.find((p) => p.id === plan)

  const go = () => {
    if (offline) {
      toast.error("You're offline. Try again when you're connected.")
      return
    }
    start(plan)
  }

  return (
    <div className="space-y-3">
      <div className="pt-3"><PlanPicker value={plan} onChange={setPlan} /></div>
      <Button full size="lg" loading={loading} onClick={go} icon={<Crown className="size-4.5" aria-hidden />}>
        {loading ? 'Processing…' : cta}
      </Button>
      {selected && <p className="tabular text-center text-[13px] text-muted">{selected.price}{selected.period} · {selected.note}</p>}
      <RestoreButton />
      <LegalLinks />
    </div>
  )
}

function Hero({ tone, title, text }: { tone: 'brand' | 'warning'; title: string; text: string }) {
  return (
    <div className="flex animate-fade-up flex-col items-center pt-2 text-center">
      {tone === 'brand' ? (
        <span className="bg-brand-gradient flex size-20 animate-float items-center justify-center rounded-2xl shadow-glow"><Crown className="size-9 text-white" aria-hidden /></span>
      ) : (
        <span className="flex size-20 items-center justify-center rounded-2xl border border-warning/30 bg-warning/12"><AlertTriangle className="size-9 text-warning" aria-hidden /></span>
      )}
      <h2 className="mt-5 text-[32px] leading-tight font-extrabold tracking-tight">{tone === 'brand' ? <span className="text-brand-gradient">{title}</span> : title}</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>
    </div>
  )
}

function SuccessView() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-lg pb-8">
      <Confetti />
      <div className="flex flex-col items-center pt-4 text-center">
        <Mascot mood="love" size={148} say="We're doing this!" />
        <h2 className="mt-5 animate-fade-up text-[32px] leading-tight font-extrabold tracking-tight">You're <span className="text-brand-gradient">Premium!</span></h2>
        <p className="mt-2 max-w-sm animate-fade-up text-[15px] leading-relaxed text-muted">Your full 30-day program, the AI Coach and every tool are unlocked. Let's get you to your first payment.</p>
      </div>
      <h3 className="mt-8 mb-3 text-[17px] font-bold tracking-tight">What's unlocked</h3>
      <BenefitsList compact />
      <Button className="mt-6" full size="lg" iconRight={<ArrowRight className="size-4.5" aria-hidden />} onClick={() => navigate('/home')}>
        Go to my plan
      </Button>
    </div>
  )
}

function ManageView() {
  const subscription = useApp((s) => s.subscription)
  const subscribe = useApp((s) => s.subscribe)
  const setStatus = useApp((s) => s.setSubscriptionStatus)
  const current = plans.find((p) => p.id === subscription.plan) ?? plans[0]
  const [switching, setSwitching] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [draft, setDraft] = useState<Plan['id']>(current.id)

  return (
    <div className="grid gap-6 pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8">
      <div className="space-y-3">
        <Card variant="hero" className="animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-lg shadow-glow-sm"><Crown className="size-6 text-white" aria-hidden /></span>
            <Badge tone="success">Active</Badge>
          </div>
          <p className="mt-4 text-[13px] font-semibold tracking-wide text-brand-300 uppercase">Current plan</p>
          <h2 className="text-2xl font-extrabold tracking-tight">Premium {current.name}</h2>
          <p className="tabular mt-1 text-[15px] text-muted"><span className="font-bold text-ink">{current.price}</span>{current.period}</p>
          {subscription.renews && (
            <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-[13px] text-muted">
              <CalendarClock className="size-4 shrink-0 text-brand-300" aria-hidden />
              Renews on {formatDate(subscription.renews)}
            </p>
          )}
        </Card>
        <Button variant="secondary" full icon={<Repeat className="size-4" aria-hidden />} onClick={() => { setDraft(current.id); setSwitching(true) }}>
          Switch plan
        </Button>
        <Button variant="danger" full onClick={() => setCancelling(true)}>Cancel subscription</Button>
        <RestoreButton />
        <p className="text-center text-xs text-faint">Prototype billing — no payment is taken.</p>
      </div>

      <section>
        <h3 className="mb-3 text-[17px] font-bold tracking-tight">Included in your plan</h3>
        <BenefitsList compact />
      </section>

      <Sheet
        open={switching}
        onClose={() => setSwitching(false)}
        title="Switch plan"
        description="Your new plan starts today. Nothing is charged in this prototype."
        footer={
          <Button
            full
            size="lg"
            disabled={draft === current.id}
            onClick={() => {
              subscribe(draft)
              setSwitching(false)
              toast.success(`Switched to the ${plans.find((p) => p.id === draft)?.name ?? ''} plan`)
            }}
          >
            {draft === current.id ? 'This is your current plan' : 'Confirm switch'}
          </Button>
        }
      >
        <div className="pt-3 pb-1"><PlanPicker value={draft} onChange={setDraft} /></div>
      </Sheet>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => {
          setStatus('expired')
          toast.info('Subscription cancelled. You can renew any time.')
        }}
        title="Cancel Premium?"
        description="You'll lose access to your 30-day program, the AI Coach and your tools. Your prospects and revenue data stay saved."
        confirmLabel="Cancel subscription"
        variant="danger"
      />
    </div>
  )
}

export default function Subscription() {
  const status = useApp((s) => s.subscription.status)
  const [params] = useSearchParams()
  const success = params.get('state') === 'success' && status === 'active'

  if (success) {
    return (
      <Page title="Premium" back="/home">
        <SuccessView />
      </Page>
    )
  }

  if (status === 'active') {
    return (
      <Page title="Subscription" back>
        <ManageView />
      </Page>
    )
  }

  const expired = status === 'expired'
  return (
    <Page title={expired ? 'Subscription' : 'Premium'} back>
      <div className="grid gap-7 pb-8 lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div className="lg:col-start-1">
          {expired ? (
            <Hero tone="warning" title="Your Premium has expired" text="Your progress, prospects and revenue are safe. Renew to pick up exactly where you left off." />
          ) : (
            <Hero tone="brand" title="Premium" text="Unlock your complete FirstRevenue journey." />
          )}
        </div>
        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h3 className="mb-3 text-[17px] font-bold tracking-tight">{expired ? "What you've lost access to" : "What's included"}</h3>
          <BenefitsList lost={expired} />
        </section>
        <div className="lg:col-start-1">
          <Checkout cta={expired ? 'Renew Premium' : 'Start Premium'} />
        </div>
      </div>
    </Page>
  )
}
