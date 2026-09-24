import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { LessonCard } from '@/components/domain/LessonCard'
import { Page } from '@/components/layout/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Inputs'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { lessons } from '@/data/lessons'
import { mentorGreenFlags, mentorQuestions, mentorRedFlags, mentorScore, mentorVerdict } from '@/data/mentors'
import type { MentorVerdict } from '@/data/types'
import { cn } from '@/lib/cn'

const mentorLessons = lessons.filter((l) => l.category === 'Choosing Mentors')

const verdictTone: Record<MentorVerdict['id'], 'success' | 'warning' | 'danger'> = { trust: 'success', caution: 'warning', avoid: 'danger' }
const verdictText: Record<MentorVerdict['id'], string> = { trust: 'text-success', caution: 'text-warning', avoid: 'text-danger' }

type Stage = 'intro' | 'quiz' | 'result'

function Intro({ name, setName, onStart }: { name: string; setName: (v: string) => void; onStart: () => void }) {
  return (
    <div className="stagger space-y-8">
      <Card variant="hero">
        <span className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Before you pay anyone</span>
        <h2 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight">Is this mentor worth your money?</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Answer 10 quick questions about a course, coach or influencer — in any field. You get a risk score and the exact red flags to ask about.
        </p>
        <TextField className="mt-5" label="Who are you checking? (optional)" placeholder="Name, course or account" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <Button size="lg" full className="mt-4 sm:w-auto" onClick={onStart} iconRight={<ArrowRight className="size-5" aria-hidden />}>
          Start the 2-Minute Check
        </Button>
      </Card>

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeader title="7 Red Flags" />
          <Card pad={false} className="divide-y divide-line">
            {mentorRedFlags.map((f) => (
              <div key={f.title} className="flex gap-3 px-4 py-3.5">
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-danger" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{f.detail}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <SectionHeader title="5 Green Flags" />
          <Card pad={false} className="divide-y divide-line">
            {mentorGreenFlags.map((f) => (
              <div key={f.title} className="flex gap-3 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{f.detail}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>

      <section>
        <SectionHeader title="Learn to Spot Them" to="/lessons" action="Library" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mentorLessons.map((l) => <LessonCard key={l.id} lesson={l} layout="row" />)}
        </div>
      </section>
    </div>
  )
}

function Quiz({ answers, onAnswer, onBack }: { answers: number[]; onAnswer: (option: number) => void; onBack: () => void }) {
  const index = answers.length
  const q = mentorQuestions[index]
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1.5 flex justify-between text-xs font-medium text-muted">
        <span>Question {index + 1} of {mentorQuestions.length}</span>
        <span className="tabular">{Math.round((index / mentorQuestions.length) * 100)}%</span>
      </div>
      <ProgressBar value={index / mentorQuestions.length} label="Mentor check progress" />

      <h2 key={q.id} className="animate-fade-up mt-6 text-2xl leading-tight font-extrabold tracking-tight">{q.question}</h2>
      <div key={`${q.id}-options`} className="stagger mt-5 space-y-2.5" role="group" aria-label={q.question}>
        {q.options.map((o, i) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onAnswer(i)}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[15px] font-medium transition-all duration-200 hover:border-brand-500/50 hover:bg-surface-2 active:scale-[0.99]"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-muted">{String.fromCharCode(65 + i)}</span>
            {o.label}
          </button>
        ))}
      </div>

      <Button variant="ghost" className="mt-5" onClick={onBack} icon={<ArrowLeft className="size-4" aria-hidden />}>
        {index === 0 ? 'Back to Intro' : 'Previous Question'}
      </Button>
    </div>
  )
}

function Result({ name, answers, onRestart }: { name: string; answers: number[]; onRestart: () => void }) {
  const navigate = useNavigate()
  const score = mentorScore(answers)
  const verdict = mentorVerdict(score)
  const tone = verdictTone[verdict.id]
  const flagged = mentorQuestions
    .map((q, i) => ({ q, option: q.options[answers[i]] }))
    .filter((x) => x.option && x.option.risk > 0)
    .sort((a, b) => b.option.risk - a.option.risk)

  return (
    <div className="stagger space-y-8">
      <Card className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <ProgressRing value={score / 100} size={132} label="Risk score">
          <span className="tabular text-[32px] leading-none font-extrabold tracking-tight">{score}</span>
          <span className="mt-1 text-[11px] font-semibold tracking-wider text-faint uppercase">Risk / 100</span>
        </ProgressRing>
        <div className="min-w-0">
          <Badge tone={tone}>{name.trim() || 'This mentor'}</Badge>
          <h2 className={cn('mt-2 text-2xl leading-tight font-extrabold tracking-tight', verdictText[verdict.id])}>{verdict.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{verdict.summary}</p>
        </div>
      </Card>

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionHeader title="What to Do Next" />
          <Card pad={false} className="divide-y divide-line">
            {verdict.next.map((step, i) => (
              <div key={step} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
                <span className="text-ink-soft">{step}</span>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <SectionHeader title={flagged.length ? `Flags Found (${flagged.length})` : 'Flags Found'} />
          {flagged.length ? (
            <Card pad={false} className="divide-y divide-line">
              {flagged.map(({ q, option }) => (
                <div key={q.id} className="flex gap-3 px-4 py-3.5">
                  <AlertTriangle className={cn('mt-0.5 size-4.5 shrink-0', option.risk === 2 ? 'text-danger' : 'text-warning')} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{option.label}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{q.why}</p>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card variant="completed" className="flex items-center gap-3 text-sm text-ink-soft">
              <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden />
              No red flags. Still apply their free content for a week before you pay.
            </Card>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" onClick={onRestart} icon={<RotateCcw className="size-4.5" aria-hidden />}>Check Another Mentor</Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/coach')} icon={<Sparkles className="size-4.5" aria-hidden />}>Ask the Coach</Button>
      </div>
    </div>
  )
}

export default function MentorCheck() {
  const [stage, setStage] = useState<Stage>('intro')
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState<number[]>([])

  const answer = (option: number) => {
    const next = [...answers, option]
    setAnswers(next)
    if (next.length === mentorQuestions.length) setStage('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => (answers.length ? setAnswers(answers.slice(0, -1)) : setStage('intro'))
  const restart = () => {
    setAnswers([])
    setName('')
    setStage('intro')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Page back title="Mentor Check" subtitle={stage === 'intro' ? 'Tell a real mentor from a fake guru — in any field.' : undefined}>
      {stage === 'intro' && <Intro name={name} setName={setName} onStart={() => setStage('quiz')} />}
      {stage === 'quiz' && <Quiz answers={answers} onAnswer={answer} onBack={back} />}
      {stage === 'result' && <Result name={name} answers={answers} onRestart={restart} />}
    </Page>
  )
}
