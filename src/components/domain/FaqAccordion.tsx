import { useEffect, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FaqItem } from '@/data/types'
import { cn } from '@/lib/cn'

/** Accessible single-open accordion with a smooth height + opacity transition. */
export function FaqAccordion({ items, initialOpen }: { items: FaqItem[]; initialOpen?: string | null }) {
  const base = useId()
  const [open, setOpen] = useState<string | null>(initialOpen ?? null)
  useEffect(() => {
    if (initialOpen) setOpen(initialOpen)
  }, [initialOpen])

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((item, i) => {
        const on = open === item.q
        const panelId = `${base}-panel-${i}`
        const buttonId = `${base}-button-${i}`
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={on}
                aria-controls={panelId}
                onClick={() => setOpen(on ? null : item.q)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className={cn('flex-1 text-[15px] leading-snug font-semibold transition-colors', on && 'text-brand-300')}>{item.q}</span>
                <ChevronDown className={cn('size-4.5 shrink-0 text-faint transition-transform duration-300', on && 'rotate-180 text-brand-300')} aria-hidden />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!on}
              className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out', on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
            >
              <div className={cn('overflow-hidden transition-[visibility] duration-300', !on && 'invisible')}>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
