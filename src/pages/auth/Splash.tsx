import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoMark } from '@/components/layout/Logo'
import { Mascot } from '@/components/mascot/Mascot'
import { useApp } from '@/store/useApp'

export default function Splash() {
  const navigate = useNavigate()
  const authed = useApp((s) => s.authed)
  const onboarded = useApp((s) => s.onboarded)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const DURATION = 2400
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
      else navigate(authed ? (onboarded ? '/home' : '/onboarding') : '/welcome', { replace: true })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [authed, onboarded, navigate])

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-8">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full bg-brand-600/25 blur-[110px]" />
      <div aria-hidden className="absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-[62%] animate-spin-slow rounded-full border border-dashed border-brand-500/25">
        <span className="absolute -top-1.5 left-1/2 size-3 rounded-full bg-brand-400 shadow-glow-sm" />
        <span className="absolute top-1/2 -left-1 size-2 rounded-full bg-accent" />
        <span className="absolute right-6 bottom-4 size-2.5 rounded-full bg-success" />
      </div>

      <div className="relative animate-scale-in">
        <Mascot mood={progress > 0.85 ? 'excited' : 'happy'} size={168} interactive={false} />
      </div>
      <div className="relative mt-8 flex animate-fade-up items-center gap-3 [animation-delay:250ms]">
        <LogoMark size={44} />
        <h1 className="text-3xl font-extrabold tracking-tight">
          First<span className="text-brand-gradient">Revenue</span>
        </h1>
      </div>
      <p className="relative mt-3 animate-fade-up text-[15px] text-muted [animation-delay:450ms]">Your first client starts here.</p>

      <div className="relative mt-10 h-1 w-40 animate-fade-in overflow-hidden rounded-full bg-surface-3 [animation-delay:600ms]" role="progressbar" aria-label="Loading FirstRevenue" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
