import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Minus, Plus, X } from 'lucide-react'
import { CheckInSummary, type CheckinAnswers } from '@/components/domain/CheckInSummary'
import { Mascot } from '@/components/mascot/Mascot'
import { Button, IconButton } from '@/components/ui/Button'
import { TextArea } from '@/components/ui/Inputs'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useProgram, useStats } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const STEPS = [
  { key: 'accomplished', emoji: '🏁', title: 'What did you accomplish?', subtitle: 'Big or small. Missions, samples, messages sent — it all counts.', placeholder: 'e.g. Finished my portfolio and sent my first 10 messages' },
  { key: 'difficult', emoji: '🧗', title: 'What was difficult?', subtitle: 'Naming the hard part is how you get past it.', placeholder: 'e.g. Finding creators who actually reply' },
  { key: 'prospects', emoji: '📨', title: 'How many prospects did you contact?', subtitle: 'Prefilled from your prospect list. Adjust if you reached out elsewhere.' },
  { key: 'replies', emoji: '💬', title: 'How many replies did you receive?', subtitle: 'Any reply counts — even a “not right now”.' },
  { key: 'madeMoney', emoji: '💸', title: 'Did you make money?', subtitle: 'Be honest. “Not yet” is a perfectly normal answer.' },
  { key: 'improve', emoji: '🎯', title: 'What do you want to improve?', subtitle: 'Pick one thing. This becomes part of next week’s focus.', placeholder: 'e.g. Writing better first lines' },
] as const

const QUICK_PICKS = ['Send more outreach', 'Write better openers', 'Follow up faster', 'Be more consistent', 'Price with confidence']

const stepBtn = 'flex size-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-95 disabled:opacity-40 disabled:active:scale-100'

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const set = (n: number) => onChange(Math.min(Math.max(n, 0), 999))
  return (
    <div className="flex items-center justify-center gap-5" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease" className={stepBtn} disabled={value <= 0} onClick={() => set(value - 1)}><Minus className="size-6" aria-hidden /></button>
      <output className="tabular w-28 text-center text-6xl font-extrabold tracking-tight" aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase" className={stepBtn} onClick={() => set(value + 1)}><Plus className="size-6" aria-hidden /></button>
    </div>
  )
}

export default function CheckIn() {
  const navigate = useNavigate()
  const stats = useStats()
  const { progress } = useProgram()
  const addCheckin = useApp((s) => s.addCheckin)
  const currentDay = progress.currentDay
  const week = Math.max(1, Math.ceil(currentDay / 7) - (currentDay % 7 === 0 ? 0 : 1)) || 1

  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<'form' | 'analysing' | 'summary'>('form')
  const [answers, setAnswers] = useState<CheckinAnswers & { moneyAnswered: boolean }>({
    accomplished: '',
    difficult: '',
    prospects: stats.contacted,
    replies: stats.replies,
    madeMoney: false,
    moneyAnswered: false,
    improve: '',
  })
  const patch = (p: Partial<typeof answers>) => setAnswers((a) => ({ ...a, ...p }))

  useEffect(() => {
    if (phase !== 'analysing') return
    const id = setTimeout(() => setPhase('summary'), 1200)
    return () => clearTimeout(id)
  }, [phase])

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/home'))
  const current = STEPS[step]
  const valid =
    current.key === 'accomplished' || current.key === 'difficult' || current.key === 'improve'
      ? answers[current.key].trim().length >= 3
      : current.key === 'madeMoney'
        ? answers.moneyAnswered
        : current.key === 'replies'
          ? answers.replies <= answers.prospects
          : true

  const next = () => {
    if (!valid) return
    if (step < STEPS.length - 1) setStep(step + 1)
    else setPhase('analysing')
  }

  const save = () => {
    addCheckin({
      week,
      accomplished: answers.accomplished.trim(),
      difficult: answers.difficult.trim(),
      prospects: answers.prospects,
      replies: answers.replies,
      madeMoney: answers.madeMoney,
      improve: answers.improve.trim(),
    })
    toast.success('Check-in saved · +50 XP')
    navigate('/plan')
  }

  const progressValue = phase === 'form' ? (step + 1) / STEPS.length : 1

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-bg">
      <header className="safe-top sticky top-0 z-20 bg-bg/85 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-h-14 items-center gap-3 py-1.5">
          <IconButton label="Close check-in" onClick={close} className="-ml-1"><X className="size-5" aria-hidden /></IconButton>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Check-in progress" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={phase === 'form' ? step + 1 : STEPS.length}>
            <div className="bg-brand-gradient h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${progressValue * 100}%` }} />
          </div>
          <span className="tabular w-10 text-right text-[13px] font-semibold text-muted">{phase === 'form' ? `${step + 1}/${STEPS.length}` : 'Done'}</span>
        </div>
      </header>

      {phase === 'analysing' && (
        <div className="flex flex-1 animate-fade-in flex-col items-center justify-center px-6 pb-16 text-center" role="status">
          <Mascot mood="thinking" size={148} interactive={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Reading your week…</h1>
          <p className="mt-1.5 text-[15px] text-muted">Penny is putting together your summary.</p>
        </div>
      )}

      {phase === 'summary' && <CheckInSummary week={week} answers={answers} stats={stats} onContinue={save} />}

      {phase === 'form' && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <div key={step} className="flex-1 animate-fade-up px-4 pt-6 pb-6 sm:px-6">
            <p className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Week {week} check-in</p>
            <span className="mt-4 flex size-14 items-center justify-center rounded-lg border border-line bg-surface text-3xl" aria-hidden>{current.emoji}</span>
            <h1 className="mt-4 text-[28px] leading-tight font-extrabold tracking-tight">{current.title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{current.subtitle}</p>

            <div className="mt-8">
              {(current.key === 'accomplished' || current.key === 'difficult' || current.key === 'improve') && (
                <>
                  <TextArea
                    label="Your answer"
                    rows={5}
                    autoFocus
                    maxLength={400}
                    placeholder={current.placeholder}
                    value={answers[current.key]}
                    onChange={(e) => patch({ [current.key]: e.target.value })}
                    hint={answers[current.key].trim().length < 3 ? 'Write at least a few words to continue.' : `${answers[current.key].length}/400`}
                  />
                  {current.key === 'improve' && (
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Quick picks">
                      {QUICK_PICKS.map((q) => {
                        const on = answers.improve.includes(q)
                        return (
                          <button
                            key={q}
                            type="button"
                            disabled={on}
                            onClick={() => patch({ improve: (answers.improve.trim() ? `${answers.improve.trim()}. ${q}` : q).slice(0, 400) })}
                            className={cn(
                              'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 active:scale-95',
                              on ? 'border-brand-500/50 bg-brand-500/15 text-brand-300' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                            )}
                          >
                            {on ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                            {q}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {current.key === 'prospects' && <Stepper label="Prospects contacted" value={answers.prospects} onChange={(n) => patch({ prospects: n })} />}
              {current.key === 'replies' && (
                <>
                  <Stepper label="Replies received" value={answers.replies} onChange={(n) => patch({ replies: n })} />
                  <p className={cn('mt-6 text-center text-[13px]', answers.replies > answers.prospects ? 'text-danger' : 'text-faint')} role={answers.replies > answers.prospects ? 'alert' : undefined}>
                    {answers.replies > answers.prospects
                      ? `That is more replies than the ${answers.prospects} prospects you contacted.`
                      : answers.prospects > 0
                        ? `${Math.round((answers.replies / answers.prospects) * 100)}% reply rate on ${answers.prospects} contacted.`
                        : 'No outreach yet — replies start with the first message.'}
                  </p>
                </>
              )}

              {current.key === 'madeMoney' && (
                <div role="radiogroup" aria-label="Did you make money?" className="grid grid-cols-2 gap-3">
                  {[
                    { value: true, emoji: '🤑', label: 'Yes', note: 'Money came in' },
                    { value: false, emoji: '🌱', label: 'Not yet', note: 'Still planting seeds' },
                  ].map((o) => {
                    const on = answers.moneyAnswered && answers.madeMoney === o.value
                    return (
                      <button
                        key={o.label}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => patch({ madeMoney: o.value, moneyAnswered: true })}
                        className={cn(
                          'flex flex-col items-center rounded-xl border px-3 py-7 text-center transition-all duration-200 active:scale-[0.98]',
                          on ? 'border-brand-500/60 bg-brand-500/12 shadow-glow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                        )}
                      >
                        <span className="text-4xl" aria-hidden>{o.emoji}</span>
                        <span className="mt-3 text-lg font-bold tracking-tight">{o.label}</span>
                        <span className="mt-0.5 text-[13px] text-muted">{o.note}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="safe-bottom sticky bottom-0 border-t border-line bg-bg/90 px-4 pt-3 backdrop-blur-xl sm:px-6">
            <div className="flex gap-3 pb-4">
              {step > 0 && (
                <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="size-4.5" aria-hidden />}>Back</Button>
              )}
              <Button type="submit" size="lg" full disabled={!valid} iconRight={<ArrowRight className="size-4.5" aria-hidden />}>
                {step === STEPS.length - 1 ? 'See my summary' : 'Continue'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
