import { useState } from 'react'
import { Check, RotateCw, X } from 'lucide-react'
import { LegalSheet, type LegalDoc } from '@/components/domain/LegalSheet'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { premiumBenefits } from '@/data/subscription'
import { cn } from '@/lib/cn'

/** Premium benefits. `lost` renders them as things the user no longer has access to. */
export function BenefitsList({ lost, compact }: { lost?: boolean; compact?: boolean }) {
  return (
    <ul className={cn('stagger grid gap-2.5', !compact && 'sm:grid-cols-2 lg:grid-cols-1')}>
      {premiumBenefits.map((b) => (
        <li key={b.title} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3.5">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-xl', lost && 'opacity-60 grayscale')} aria-hidden>{b.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className={cn('block text-[15px] font-semibold', lost && 'text-ink-soft')}>{b.title}</span>
            {!compact && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{b.description}</span>}
          </span>
          <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', lost ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success')}>
            {lost ? <X className="size-3" strokeWidth={3} aria-label="Locked" /> : <Check className="size-3" strokeWidth={3} aria-label="Included" />}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function RestoreButton() {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      variant="ghost"
      full
      loading={loading}
      icon={<RotateCw className="size-4" aria-hidden />}
      onClick={() => {
        setLoading(true)
        window.setTimeout(() => {
          setLoading(false)
          toast.info('No previous purchase found on this account (demo)')
        }, 500)
      }}
    >
      Restore Purchase
    </Button>
  )
}

export function LegalLinks() {
  const [doc, setDoc] = useState<LegalDoc | null>(null)
  const link = 'inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline'
  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <button type="button" className={link} onClick={() => setDoc('terms')}>Terms</button>
        <span className="text-faint" aria-hidden>·</span>
        <button type="button" className={link} onClick={() => setDoc('privacy')}>Privacy</button>
      </div>
      <p className="text-center text-xs text-faint">Prototype checkout — no payment is taken.</p>
      <LegalSheet doc="terms" open={doc === 'terms'} onClose={() => setDoc(null)} />
      <LegalSheet doc="privacy" open={doc === 'privacy'} onClose={() => setDoc(null)} />
    </>
  )
}
