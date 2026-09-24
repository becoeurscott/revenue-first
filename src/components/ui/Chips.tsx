import { cn } from '@/lib/cn'

interface ChipsProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: string
  counts?: Partial<Record<T, number>>
}

/** Horizontally scrollable single-select filter chips. */
export function FilterChips<T extends string>({ options, value, onChange, label, counts }: ChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:px-0">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 active:scale-95',
            value === o ? 'border-brand-500/50 bg-brand-500/15 text-brand-300' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          {o}
          {counts?.[o] !== undefined && <span className="tabular text-[11px] opacity-70">{counts[o]}</span>}
        </button>
      ))}
    </div>
  )
}

/** Segmented tabs. */
export function Tabs<T extends string>({ options, value, onChange, label }: ChipsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'h-10 min-w-fit flex-1 shrink-0 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-all duration-200',
            value === o ? 'bg-brand-gradient text-white shadow-glow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
