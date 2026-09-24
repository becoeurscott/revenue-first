import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Eye, EyeOff, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const fieldBase =
  'w-full rounded-md border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-faint transition-colors duration-200 hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export function TextField({ label, error, hint, icon, type = 'text', className, id, ...rest }: FieldProps) {
  const auto = useId()
  const fieldId = id ?? auto
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-muted">{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint">{icon}</span>}
        <input
          id={fieldId}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined}
          className={cn(fieldBase, 'h-13', icon && 'pl-11', isPassword && 'pr-12', error && 'border-danger/60 focus:border-danger focus:ring-danger/25')}
          {...rest}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-faint hover:text-ink">
            {show ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
          </button>
        )}
      </div>
      {error && <p id={`${fieldId}-err`} role="alert" className="mt-1.5 text-[13px] text-danger">{error}</p>}
      {!error && hint && <p id={`${fieldId}-hint`} className="mt-1.5 text-[13px] text-faint">{hint}</p>}
    </div>
  )
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextArea({ label, hint, className, id, rows = 4, ...rest }: AreaProps) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-muted">{label}</label>
      <textarea id={fieldId} rows={rows} className={cn(fieldBase, 'resize-none py-3 leading-relaxed')} {...rest} />
      {hint && <p className="mt-1.5 text-[13px] text-faint">{hint}</p>}
    </div>
  )
}

export function SelectField({ label, value, onChange, options, className }: { label: string; value: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-muted">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldBase, 'h-13 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%2371717a%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-11')}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search', autoFocus, onSubmit }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; onSubmit?: () => void }) {
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(fieldBase, 'h-12 rounded-full pr-11 pl-11 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center text-faint hover:text-ink">
          <X className="size-4" aria-hidden />
        </button>
      )}
    </form>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-brand-500' : 'bg-surface-3 ring-1 ring-line-strong ring-inset')}
    >
      <span className={cn('absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200 ease-spring', checked && 'translate-x-5')} />
    </button>
  )
}
