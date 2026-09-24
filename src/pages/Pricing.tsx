import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Lightbulb, MessageCircle } from 'lucide-react'
import { PremiumGate } from '@/components/domain/Paywall'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Inputs'
import { clientSizes, experienceLevels, pricingDisclaimer, pricingOptions, recommendPrice, turnarounds } from '@/data/pricing'
import { money } from '@/lib/cn'
import { useApp } from '@/store/useApp'

const labelsOf = (list: { label: string }[]) => list.map((o) => o.label)

function Calculator() {
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const options = pricingOptions[pathId]
  const [service, setService] = useState(options.services[0].label)
  const [experience, setExperience] = useState(experienceLevels[0].label)
  const [clientSize, setClientSize] = useState(clientSizes[0].label)
  const [scope, setScope] = useState(options.scopes[0].label)
  const [turnaround, setTurnaround] = useState(turnarounds[0].label)

  const result = useMemo(
    () => recommendPrice({ path: pathId, service, experience, clientSize, scope, turnaround }),
    [pathId, service, experience, clientSize, scope, turnaround],
  )
  const target = result.breakdown.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <Card className="space-y-4">
        <h2 className="text-[17px] font-bold tracking-tight">About the job</h2>
        <SelectField label="Service" value={service} onChange={setService} options={labelsOf(options.services)} />
        <SelectField label="Your experience" value={experience} onChange={setExperience} options={labelsOf(experienceLevels)} />
        <SelectField label="Client size" value={clientSize} onChange={setClientSize} options={labelsOf(clientSizes)} />
        <SelectField label="Work scope" value={scope} onChange={setScope} options={labelsOf(options.scopes)} />
        <SelectField label="Turnaround" value={turnaround} onChange={setTurnaround} options={labelsOf(turnarounds)} />
      </Card>

      <div className="space-y-4 lg:sticky lg:top-20">
        <Card variant="hero" aria-live="polite">
          <p className="text-[13px] font-semibold tracking-wide text-brand-300 uppercase">Recommended starting price</p>
          <p key={`${result.low}-${result.high}`} className="tabular mt-1 animate-fade-in text-[40px] leading-tight font-extrabold tracking-tight text-brand-gradient sm:text-5xl">
            {money(result.low)}–{money(result.high)}
          </p>
          <p className="tabular mt-1 text-sm text-muted">Quote <span className="font-semibold text-ink">{money(target)}</span> as your target price.</p>

          <dl className="mt-5 divide-y divide-line border-y border-line">
            {result.breakdown.map((row, i) => (
              <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <dt className={row.amount === 0 ? 'text-faint' : 'text-muted'}>{row.label}</dt>
                <dd className={`tabular font-semibold ${row.amount === 0 ? 'text-faint' : 'text-ink'}`}>{row.amount === 0 ? '—' : `${i === 0 ? '' : '+'}${money(row.amount)}`}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-3 text-[15px]">
              <dt className="font-semibold">Target price</dt>
              <dd className="tabular font-extrabold">{money(target)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{result.rationale}</p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Button icon={<FileText className="size-4" aria-hidden />} onClick={() => navigate('/resources/res-proposal-template')}>Use in a proposal</Button>
            <Button variant="secondary" icon={<MessageCircle className="size-4" aria-hidden />} onClick={() => navigate('/coach')}>Ask the coach</Button>
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
            <Lightbulb className="size-4 text-warning" aria-hidden /> Pricing tips
          </h2>
          <ul className="mt-3 space-y-2.5">
            {result.tips.map((tip, i) => (
              <li key={tip} className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
                <span aria-hidden className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        <p className="px-1 text-xs leading-relaxed text-faint">{pricingDisclaimer}</p>
      </div>
    </div>
  )
}

export default function Pricing() {
  return (
    <Page title="Pricing Assistant" subtitle="Answer five quick questions and get a price you can quote with confidence." back>
      <PremiumGate feature="Pricing Assistant" description="Get a recommended price range, a breakdown and negotiation tips for any job.">
        <Calculator />
      </PremiumGate>
    </Page>
  )
}
