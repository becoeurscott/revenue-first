import { Check, MapPin, Plus, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import type { Prospect } from '@/data/types'
import { money } from '@/lib/cn'
import { useApp } from '@/store/useApp'

/** Audit-style card for a fictitious local business the user can practise on. */
export function PracticeBusinessCard({ business: b, canAdd }: { business: Prospect; canAdd: boolean }) {
  const added = useApp((s) => s.prospects.some((p) => p.business === b.business))
  const addProspect = useApp((s) => s.addProspect)
  const audit = b.gbp
  if (!audit) return null

  const add = () => {
    addProspect({ path: 'gbp', name: b.name, business: b.business, platform: b.platform, audience: b.audience, handle: b.handle, about: b.about, value: b.value, gbp: audit })
    toast.success(`${b.business} added to your prospects`)
  }

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-semibold">{b.business}</h4>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
            <MapPin className="size-3.5 shrink-0 text-faint" aria-hidden />
            {audit.category} · {audit.city}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular flex items-center justify-end gap-1 text-[15px] font-bold">
            {audit.rating.toFixed(1)} <Star className="size-3.5 fill-current text-warning" aria-label="stars" />
          </p>
          <p className="tabular text-xs text-faint">{audit.reviews} reviews</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold tracking-wider text-faint uppercase">Problems found</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {audit.problems.map((p, i) => (
          <li key={p}><Badge tone={i < 2 ? 'danger' : 'warning'}>{p}</Badge></li>
        ))}
      </ul>

      <div className="mt-4 flex flex-1 items-end justify-between gap-3 border-t border-line pt-3">
        <div className="min-w-0">
          <p className="text-xs text-faint">Suggested service</p>
          <p className="truncate text-[13px] font-medium">{audit.service}</p>
        </div>
        <p className="tabular shrink-0 text-lg font-extrabold tracking-tight">{money(b.value)}</p>
      </div>

      {added ? (
        <p className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-md bg-success/12 text-sm font-semibold text-success">
          <Check className="size-4" aria-hidden /> Added
        </p>
      ) : (
        canAdd && (
          <Button variant="secondary" full className="mt-4" onClick={add} icon={<Plus className="size-4" aria-hidden />}>
            Add to prospects
          </Button>
        )
      )}
    </Card>
  )
}
