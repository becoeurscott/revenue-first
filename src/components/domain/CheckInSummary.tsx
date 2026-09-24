import { AlertTriangle, ArrowRight, Compass, Trophy, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { StatsSnapshot, WeeklyCheckin } from '@/data/types'
import { money } from '@/lib/cn'

export type CheckinAnswers = Omit<WeeklyCheckin, 'id' | 'date' | 'week'>

const sentence = (text: string) => {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Turns raw answers + live stats into the three summary lists. Pure, so it is easy to swap for an API later. */
export function summarize(a: CheckinAnswers, stats: StatsSnapshot) {
  const rate = a.prospects ? Math.round((a.replies / a.prospects) * 100) : 0

  const wins = [sentence(a.accomplished)]
  if (stats.daysCompleted > 0) wins.push(`${stats.daysCompleted} ${stats.daysCompleted === 1 ? 'mission' : 'missions'} completed on your plan`)
  if (a.prospects > 0) wins.push(`You contacted ${a.prospects} ${a.prospects === 1 ? 'prospect' : 'prospects'} — most beginners never send one message`)
  if (a.replies > 0) wins.push(`${a.replies} ${a.replies === 1 ? 'reply' : 'replies'} received (${rate}% reply rate)`)
  if (a.madeMoney) wins.push(stats.revenue > 0 ? `You made money — ${money(stats.revenue)} collected so far` : 'You made money this week')
  if (stats.streak >= 3) wins.push(`${stats.streak}-day streak and counting`)

  const challenges = [sentence(a.difficult)]
  if (a.prospects > 0 && a.replies === 0) challenges.push('No replies yet — normal below 20 messages, but worth testing a new opener')
  else if (a.prospects >= 5 && rate < 10) challenges.push(`Reply rate is ${rate}% — the first line of your message is not landing yet`)
  if (a.prospects < 5) challenges.push('Outreach volume is low — results come from conversations, not preparation')
  if (!a.madeMoney) challenges.push('No revenue yet — that is expected this early, and fixable with more conversations')

  const focus: string[] = []
  if (a.prospects < 5) focus.push('Contact at least 10 new prospects before anything else')
  else if (rate < 10) focus.push('Rewrite your opener and send 10 more')
  else if (!a.madeMoney) focus.push('Follow up with every reply and make one clear, priced offer')
  if (a.madeMoney) focus.push('Ask your client for a testimonial and pitch a monthly retainer')
  focus.push(`Your own focus: ${sentence(a.improve)}`)
  if (focus.length < 3) focus.push('Finish every daily mission — keep the streak alive')

  return { wins, challenges, focus, rate }
}

function Block({ icon, title, tone, items }: { icon: ReactNode; title: string; tone: string; items: string[] }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
        <span className={`flex size-9 items-center justify-center rounded-sm ${tone}`}>{icon}</span>
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
            <span className="min-w-0 break-words">{t}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function CheckInSummary({ week, answers, stats, onContinue }: { week: number; answers: CheckinAnswers; stats: StatsSnapshot; onContinue: () => void }) {
  const s = summarize(answers, stats)
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 px-4 pt-2 pb-6 sm:px-6">
        <div className="flex animate-fade-up flex-col items-center text-center">
          <Mascot mood={answers.madeMoney ? 'excited' : 'happy'} size={112} />
          <p className="mt-3 text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Week {week} · Weekly summary</p>
          <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight">Here’s how your week went</h1>
          <span className="tabular mt-3 inline-flex h-8 animate-pop items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/15 px-3.5 text-[13px] font-bold text-brand-300">
            <Zap className="size-3.5 fill-current" aria-hidden /> +50 XP
          </span>
        </div>

        <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            [String(answers.prospects), 'Contacted'],
            [String(answers.replies), 'Replies'],
            [`${s.rate}%`, 'Reply rate'],
          ].map(([v, l]) => (
            <li key={l} className="rounded-lg border border-line bg-surface p-3">
              <span className="tabular block text-2xl font-extrabold tracking-tight">{v}</span>
              <span className="mt-0.5 block text-xs text-muted">{l}</span>
            </li>
          ))}
        </ul>

        <div className="stagger mt-4 space-y-3">
          <Block icon={<Trophy className="size-4.5" aria-hidden />} tone="bg-success/12 text-success" title="Wins" items={s.wins} />
          <Block icon={<AlertTriangle className="size-4.5" aria-hidden />} tone="bg-warning/12 text-warning" title="Challenges" items={s.challenges} />
          <Block icon={<Compass className="size-4.5" aria-hidden />} tone="bg-brand-500/15 text-brand-300" title="Next week’s focus" items={s.focus} />
        </div>
      </div>
      <div className="safe-bottom sticky bottom-0 border-t border-line bg-bg/90 px-4 pt-3 backdrop-blur-xl sm:px-6">
        <div className="pb-4">
          <Button full size="lg" onClick={onContinue} iconRight={<ArrowRight className="size-4.5" aria-hidden />}>Continue My Plan</Button>
        </div>
      </div>
    </div>
  )
}
