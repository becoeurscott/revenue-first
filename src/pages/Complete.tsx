import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Eye, Play, Repeat, Rocket, Share2, X } from 'lucide-react'
import { AdvancedProgramSheet, CountStat, SHOWCASE_RESULTS } from '@/components/domain/CompleteParts'
import { Mascot } from '@/components/mascot/Mascot'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { toast } from '@/components/ui/Toast'
import { money } from '@/lib/cn'
import { useProgram, useStats } from '@/store/selectors'
import { useApp } from '@/store/useApp'

export default function Complete() {
  const navigate = useNavigate()
  const { finished, path } = useProgram()
  const live = useStats()
  const firstName = useApp((s) => s.user.name.trim().split(' ')[0])
  const [advanced, setAdvanced] = useState(false)

  const r = finished
    ? { missions: live.missions, lessons: live.lessons, contacted: live.contacted, replies: live.replies, clients: live.clients, revenue: live.revenue }
    : SHOWCASE_RESULTS

  const share = async () => {
    const text = `I just finished the FirstRevenue 30-day ${path.name} program: ${r.missions} missions, ${r.contacted} prospects contacted, ${r.clients} ${r.clients === 1 ? 'client' : 'clients'} and ${money(r.revenue)} earned.`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: '30 days complete', text })
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success('Results copied to your clipboard')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Could not share right now. Try again.')
    }
  }

  const options = [
    {
      icon: Play,
      title: 'Continue Your Path',
      body: `Keep working your ${path.name} pipeline and grow the clients you have.`,
      onClick: () => {
        toast.success('Your path stays open. Keep the momentum going.')
        navigate('/home')
      },
    },
    { icon: Repeat, title: 'Switch Paths', body: 'Add a second income skill. Your progress here stays saved.', onClick: () => navigate('/paths') },
    { icon: Rocket, title: 'Start Advanced Program', body: 'Scale from first revenue to a steady $2K/month.', onClick: () => setAdvanced(true) },
  ]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <Confetti count={90} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(124_58_237/0.35),transparent_70%)]" aria-hidden />

      <header className="safe-top relative z-10 mx-auto flex w-full max-w-3xl items-center justify-end px-4 sm:px-6">
        <div className="flex min-h-14 items-center">
          <IconButton label="Close" onClick={() => navigate('/home')}><X className="size-5" aria-hidden /></IconButton>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <section className="flex flex-col items-center text-center">
          <div className="mt-10 animate-scale-in"><Mascot mood="excited" size={184} say={firstName ? `You did it, ${firstName}!` : 'You did it!'} /></div>
          <h1 className="text-brand-gradient mt-5 animate-fade-up text-[44px] leading-[1.02] font-extrabold tracking-tight sm:text-7xl">30 DAYS COMPLETE</h1>
          <p className="mt-4 max-w-md animate-fade-up text-[17px] leading-relaxed text-muted">
            {firstName ? `${firstName}, you` : 'You'} showed up for 30 days and built a real skill people pay for. Most people never get past day three.
          </p>
          {!finished && (
            <Badge tone="info" className="mt-4" icon={<Eye className="size-3" aria-hidden />}>Preview with sample results</Badge>
          )}
        </section>

        <section className="mt-8" aria-label="Your results">
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CountStat emoji="🎯" value={r.missions} label="Missions completed" />
            <CountStat emoji="🎬" value={r.lessons} label="Lessons watched" />
            <CountStat emoji="📨" value={r.contacted} label="Prospects contacted" />
            <CountStat emoji="💬" value={r.replies} label="Replies" />
            <CountStat emoji="🤝" value={r.clients} label={r.clients === 1 ? 'Client' : 'Clients'} />
            <CountStat emoji="💸" value={r.revenue} prefix="$" label="Earned" accent />
          </div>
          <Button variant="secondary" size="lg" full className="mt-4" onClick={share} icon={<Share2 className="size-4.5" aria-hidden />}>
            Share my results
          </Button>
        </section>

        <section className="mt-10" aria-labelledby="whats-next">
          <h2 id="whats-next" className="text-[22px] font-extrabold tracking-tight">What happens next?</h2>
          <p className="mt-1 text-[15px] text-muted">Pick a direction. You can change your mind later.</p>
          <div className="stagger mt-4 grid gap-3 sm:grid-cols-3">
            {options.map(({ icon: Icon, title, body, onClick }, i) => (
              <button
                key={title}
                type="button"
                onClick={onClick}
                className={
                  i === 0
                    ? 'flex items-start gap-3 rounded-xl border border-brand-500/50 bg-brand-500/12 p-4 text-left shadow-glow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.99] sm:flex-col'
                    : 'flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99] sm:flex-col'
                }
              >
                <span className={i === 0 ? 'bg-brand-gradient flex size-11 shrink-0 items-center justify-center rounded-md text-white' : 'flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-300'}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold tracking-tight">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{body}</span>
                </span>
                <ChevronRight className="mt-3 size-4 shrink-0 text-faint sm:hidden" aria-hidden />
              </button>
            ))}
          </div>
        </section>

        <div className="safe-bottom mt-8 flex justify-center">
          <Button variant="ghost" onClick={() => navigate('/home')}>Back to home</Button>
        </div>
      </main>

      <AdvancedProgramSheet open={advanced} onClose={() => setAdvanced(false)} />
    </div>
  )
}
