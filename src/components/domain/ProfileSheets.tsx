import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Inputs'
import { ProgressBar } from '@/components/ui/Progress'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { onboardingSteps } from '@/data/onboarding'
import { cn, money } from '@/lib/cn'
import { useStats } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const goalStep = onboardingSteps.find((s) => s.key === 'goal')
const skillStep = onboardingSteps.find((s) => s.key === 'skills')
export const GOAL_OPTIONS: string[] = goalStep?.options?.map((o) => o.value) ?? []
const SKILL_OPTIONS = (skillStep?.options ?? []).filter((o) => o.value !== 'None yet')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SheetState {
  open: boolean
  onClose: () => void
}

/** Edit name, email and income goal. Shared by Profile and Settings. */
export function EditProfileSheet({ open, onClose }: SheetState) {
  const user = useApp((s) => s.user)
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [goal, setGoal] = useState(user.goal)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  useEffect(() => {
    if (!open) return
    setName(user.name)
    setEmail(user.email)
    setGoal(GOAL_OPTIONS.includes(user.goal) ? user.goal : (GOAL_OPTIONS[3] ?? user.goal))
    setErrors({})
  }, [open, user.name, user.email, user.goal])

  const save = () => {
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Enter your name.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    setErrors(next)
    if (next.name || next.email) return
    updateProfile({ name: name.trim(), email: email.trim(), goal, goalAmount: Number(goal.replace(/[^0-9]/g, '')) || user.goalAmount })
    toast.success('Profile updated')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" description="This is how you appear across FirstRevenue." footer={<Button full size="lg" onClick={save}>Save changes</Button>}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
        <SelectField label="First income goal (30 days)" value={goal} onChange={setGoal} options={GOAL_OPTIONS} />
        <button type="submit" className="sr-only" tabIndex={-1}>Save changes</button>
      </form>
    </Sheet>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3.5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold">{value || 'Not set'}</dd>
    </div>
  )
}

/** Read-only summary of what the user told us during onboarding, with progress toward the goal. */
export function GoalsSheet({ open, onClose, onEdit }: SheetState & { onEdit: () => void }) {
  const user = useApp((s) => s.user)
  const answers = useApp((s) => s.answers)
  const { revenue } = useStats()
  const target = user.goalAmount || 500
  const ratio = Math.min(revenue / target, 1)
  const left = Math.max(target - revenue, 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="My goals"
      description="What you told us when you started. Your plan is built around it."
      footer={<Button variant="secondary" full onClick={onEdit}>Change my goal</Button>}
    >
      <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-300 uppercase">30-day goal</p>
            <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">
              {money(revenue)} <span className="text-base font-semibold text-faint">/ {user.goal || money(target)}</span>
            </p>
          </div>
          <span className="tabular text-sm font-bold text-brand-300">{Math.round(ratio * 100)}%</span>
        </div>
        <ProgressBar className="mt-3" value={ratio} label="Progress toward income goal" tone={ratio >= 1 ? 'success' : 'brand'} />
        <p className="mt-2.5 text-[13px] text-muted">{left === 0 ? 'Goal reached. Time to pick a bigger one.' : `${money(left)} to go. One more client could close the gap.`}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Fact label="Time per day" value={answers.time || user.time} />
        <Fact label="Starting budget" value={answers.budget || user.budget} />
        <Fact label="Experience" value={answers.experience || user.experience} />
        <Fact label="Commitment" value={answers.commitment} />
      </dl>
      <div className="mt-3 rounded-lg border border-line bg-surface p-3.5">
        <p className="text-xs text-faint">Biggest blocker</p>
        <p className="mt-0.5 text-[15px] font-semibold">{answers.blocker || 'Not set'}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Your daily missions and coach answers are tuned to help you get past this.</p>
      </div>
    </Sheet>
  )
}

/** Toggle skills from the onboarding list. */
export function SkillsSheet({ open, onClose }: SheetState) {
  const skills = useApp((s) => s.user.skills)
  const updateProfile = useApp((s) => s.updateProfile)
  const [draft, setDraft] = useState<string[]>(skills)

  useEffect(() => {
    if (open) setDraft(skills)
  }, [open, skills])

  const toggle = (value: string) => setDraft((d) => (d.includes(value) ? d.filter((x) => x !== value) : [...d, value]))
  const save = () => {
    updateProfile({ skills: draft.filter((x) => x !== 'None yet') })
    toast.success('Skills updated')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="My skills" description="Pick everything that applies. We use this to tailor suggestions." footer={<Button full size="lg" onClick={save}>Save skills</Button>}>
      <div role="group" aria-label="Skills" className="flex flex-wrap gap-2 pb-1">
        {SKILL_OPTIONS.map((o) => {
          const on = draft.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200 active:scale-95',
                on ? 'border-brand-500/50 bg-brand-500/15 text-brand-300' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <span aria-hidden>{o.emoji}</span>
              {o.value}
              {on && <Check className="size-3.5" aria-hidden />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[13px] text-faint">{draft.length === 0 ? 'No skills selected — that is fine, both paths start from zero.' : `${draft.length} selected`}</p>
    </Sheet>
  )
}
