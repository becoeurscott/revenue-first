import { cn } from '@/lib/cn'

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('bg-brand-gradient inline-flex shrink-0 items-center justify-center shadow-glow-sm', className)} style={{ width: size, height: size, borderRadius: size * 0.28 }} aria-hidden>
      <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
        <path d="M16 46 L27 33 L35 39 L48 20" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="48" cy="20" r="4.500" fill="#fff" />
      </svg>
    </span>
  )
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-lg font-extrabold tracking-tight">
        First<span className="text-brand-gradient">Revenue</span>
      </span>
    </span>
  )
}
