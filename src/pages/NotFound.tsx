import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }
  return (
    <main className="safe-top safe-bottom relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-[65%] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative flex max-w-sm animate-fade-up flex-col items-center">
        <Mascot mood="sad" size={160} say="I looked everywhere…" />
        <p className="text-brand-gradient tabular mt-6 text-sm font-bold tracking-[0.3em]">404</p>
        <h1 className="mt-2 text-[32px] leading-[1.1] font-extrabold tracking-tight">This page took a day off</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">The link may be broken or the page may have moved. Your streak is safe — let's get you back on track.</p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
          <Button full size="lg" icon={<Home className="size-4.5" aria-hidden />} onClick={() => navigate('/home')}>Back to Home</Button>
          <Button full size="lg" variant="secondary" icon={<ArrowLeft className="size-4.5" aria-hidden />} onClick={goBack}>Go back</Button>
        </div>
      </div>
    </main>
  )
}
