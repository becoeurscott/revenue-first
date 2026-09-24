import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: Size
  full?: boolean
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white shadow-glow-sm hover:brightness-110',
  secondary: 'bg-surface-2 text-ink border border-line hover:border-line-strong hover:bg-surface-3',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20',
  success: 'bg-success/12 text-success border border-success/25 hover:bg-success/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-sm gap-1.5',
  md: 'h-11 px-5 text-sm rounded-md gap-2',
  lg: 'h-14 px-6 text-base rounded-lg gap-2',
}

export function Button({ variant = 'primary', size = 'md', full, loading, icon, iconRight, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-200 ease-out select-none active:scale-[0.97]',
        'disabled:opacity-40 disabled:shadow-none disabled:active:scale-100',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function IconButton({ label, active, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:border-line-strong hover:text-ink active:scale-95',
        active && 'border-brand-500/40 bg-brand-500/15 text-brand-300',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
