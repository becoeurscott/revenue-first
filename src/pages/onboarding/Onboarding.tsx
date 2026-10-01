import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { onboardingSteps } from '@/data/onboarding'
import type { OnboardingOption } from '@/data/types'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/useApp'

/** Shown once, mid-flow, to break up the questions (index of the step it precedes). */
const INTERSTITIAL_BEFORE = 7

function OptionCard({ option, selected, multi, onSelect }: { option: OnboardingOption; selected: boolean; multi: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-15 w-full items-center gap-3.5 rounded-lg border px-4 py-3 text-left transition-all duration-200 active:scale-[0.98]',
        selected ? 'border-brand-500/60 bg-brand-500/15 shadow-glow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <span className="text-2xl" aria-hidden>{option.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{option.value}</span>
        {option.hint && <span className="block text-[13px] text-muted">{option.hint}</span>}
      </span>
      <span className={cn('flex size-6 shrink-0 items-center justify-center border transition-all duration-200', multi ? 'rounded-md' : 'rounded-full', selected ? 'bg-brand-gradient border-transparent text-white' : 'border-line-strong')}>
        {selected && <Check className="size-3.5 animate-pop" aria-hidden />}
      </span>
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const answers = useApp((s) => s.answers)
  const setAnswer = useApp((s) => s.setAnswer)
  const onboarded = useApp((s) => s.onboarded)
  const [index, setIndex] = useState(0)
  const [interstitial, setInterstitial] = useState(false)
  const autoAdvance = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (onboarded) navigate('/home', { replace: true })
  }, [onboarded, navigate])

  const step = onboardingSteps[index]
  const total = onboardingSteps.length
  const value = answers[step.key] ?? ''
  const valid = Array.isArray(value) ? value.length > 0 : value.trim().length >= (step.kind === 'text' ? 2 : 1)

  const next = () => {
    clearTimeout(autoAdvance.current)
    if (index === total - 1) return navigate('/onboarding/results')
    if (index + 1 === INTERSTITIAL_BEFORE && !interstitial) return setInterstitial(true)
    setInterstitial(false)
    setIndex((i) => i + 1)
  }
  const back = () => {
    clearTimeout(autoAdvance.current)
    if (interstitial) return setInterstitial(false)
    if (index === 0) return navigate('/welcome')
    setIndex((i) => i - 1)
  }

  const select = (option: string) => {
    if (step.kind === 'multi') {
      const current = answers.skills
      let nextSkills: string[]
      if (option === 'None yet') nextSkills = current.includes(option) ? [] : [option]
      else nextSkills = current.includes(option) ? current.filter((s) => s !== option) : [...current.filter((s) => s !== 'None yet'), option]
      setAnswer('skills', nextSkills)
    } else {
      setAnswer(step.key, option as never)
      // single choice → glide forward on its own; Continue still works
      clearTimeout(autoAdvance.current)
      autoAdvance.current = setTimeout(next, 320)
    }
  }

  const progress = (index + (interstitial ? 1 : 0)) / total

  return (
    <div className="flex min-h-dvh justify-center bg-bg">
      <div className="safe-top safe-bottom flex w-full max-w-md flex-col px-5">
        {/* progress + nav */}
        <div className="pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}>
            <div className="bg-brand-gradient h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(progress, 0.04) * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={back} className="inline-flex h-10 items-center gap-1 rounded-full border border-line bg-surface pr-4 pl-2.5 text-[13px] font-semibold text-ink-soft hover:border-line-strong active:scale-95">
              <ChevronLeft className="size-4" aria-hidden /> Back
            </button>
            <span className="tabular text-[13px] font-semibold text-brand-300" aria-live="polite">
              {index + 1} / {total}
            </span>
          </div>
        </div>

        {interstitial ? (
          <div key="interstitial" className="flex flex-1 animate-fade-up flex-col items-center justify-center text-center">
            <Mascot mood="excited" size={190} />
            <h1 className="mt-8 text-[28px] font-extrabold tracking-tight">We got your back{answers.name ? `, ${answers.name}` : ''}</h1>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
              With hands-on daily missions and a coach in your pocket, you'll reach your first client with a lot less guesswork.
            </p>
          </div>
        ) : (
          <div key={step.key} className="flex flex-1 animate-fade-up flex-col pt-5">
            <div className="flex items-end gap-1">
              <Mascot mood={index === total - 1 ? 'excited' : index % 3 === 2 ? 'wink' : 'happy'} size={76} float={false} say={step.mascotLine} bubbleSide="right" />
            </div>
            <h1 className="mt-4 text-[26px] leading-tight font-extrabold tracking-tight">
              <span aria-hidden className="mr-2">{step.emoji}</span>
              {step.title}
            </h1>
            <p className="mt-2 text-[15px] text-muted">{step.subtitle}</p>

            {step.kind === 'text' ? (
              <form className="mt-7" onSubmit={(e) => { e.preventDefault(); if (valid) next() }}>
                <label htmlFor="ob-name" className="sr-only">{step.title}</label>
                <input
                  id="ob-name"
                  autoFocus
                  autoComplete="given-name"
                  value={answers.name}
                  onChange={(e) => setAnswer('name', e.target.value)}
                  placeholder={step.placeholder}
                  maxLength={24}
                  className="h-16 w-full rounded-lg border border-line bg-surface px-5 text-xl font-semibold placeholder:font-medium placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
                />
              </form>
            ) : (
              <div role={step.kind === 'multi' ? 'group' : 'radiogroup'} aria-label={step.title} className={cn('stagger mt-6 pb-4', step.kind === 'multi' ? 'grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2' : 'space-y-2.5')}>
                {step.options?.map((o) => (
                  <OptionCard key={o.value} option={o} multi={step.kind === 'multi'} selected={Array.isArray(value) ? value.includes(o.value) : value === o.value} onSelect={() => select(o.value)} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6 pb-5">
          <Button size="lg" full disabled={!interstitial && !valid} onClick={next} iconRight={<ArrowRight className="size-5" aria-hidden />}>
            {index === total - 1 ? 'Build My Plan' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
