import { useState } from 'react'
import { CheckCircle2, Clock, Send } from 'lucide-react'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextArea, TextField, Toggle } from '@/components/ui/Inputs'
import { toast } from '@/components/ui/Toast'
import { helpTopics, problemCategories } from '@/data/help'
import { cn } from '@/lib/cn'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUBJECTS = [...helpTopics.map((t) => t.title), 'Something else']
const ticketNumber = () => `FR-${Math.floor(10000 + Math.random() * 90000)}`
const OFFLINE_MESSAGE = "You're offline. Try again when you're connected."

export function ContactForm() {
  const user = useApp((s) => s.user)
  const offline = useApp((s) => s.settings.offline)
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(user.email)
  const [errors, setErrors] = useState<{ message?: string; email?: string }>({})
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<string | null>(null)

  const submit = () => {
    const e: typeof errors = {}
    if (message.trim().length < 10) e.message = 'Tell us a little more — at least 10 characters.'
    if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email so we can reply.'
    setErrors(e)
    if (e.message || e.email) return
    if (offline) {
      toast.error(OFFLINE_MESSAGE)
      return
    }
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setTicket(ticketNumber())
    }, 1000)
  }

  if (ticket) {
    return (
      <Card variant="completed" className="animate-scale-in text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h3 className="mt-3 text-xl font-bold tracking-tight">Message sent</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">We'll reply to <span className="font-medium text-ink">{email.trim()}</span>.</p>
        <dl className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-surface p-3">
            <dt className="text-xs text-faint">Ticket</dt>
            <dd className="tabular text-[15px] font-bold">{ticket}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <dt className="flex items-center gap-1 text-xs text-faint"><Clock className="size-3" aria-hidden /> Expected reply</dt>
            <dd className="text-[15px] font-bold">Within 24 hours</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-faint">Demo only — no message was actually sent.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setTicket(null)
            setMessage('')
          }}
        >
          Send another message
        </Button>
      </Card>
    )
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <SelectField label="Subject" value={subject} onChange={setSubject} options={SUBJECTS} />
      <div>
        <TextArea label="Message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you need help with?" aria-invalid={!!errors.message} maxLength={1000} />
        {errors.message && <p role="alert" className="mt-1.5 text-[13px] text-danger">{errors.message}</p>}
      </div>
      <TextField label="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
      <Button type="submit" full size="lg" loading={loading} icon={<Send className="size-4" aria-hidden />}>
        {loading ? 'Sending…' : 'Send message'}
      </Button>
      <p className="text-center text-[13px] text-faint">We usually reply within 24 hours, Monday to Friday.</p>
    </form>
  )
}

export function ReportForm() {
  const offline = useApp((s) => s.settings.offline)
  const { path, progress } = useProgram()
  const [category, setCategory] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [diagnostics, setDiagnostics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<string | null>(null)

  const submit = () => {
    if (!category) return setError('Pick the category that fits best.')
    if (description.trim().length < 10) return setError('Describe what happened — at least 10 characters.')
    setError(null)
    if (offline) {
      toast.error(OFFLINE_MESSAGE)
      return
    }
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setTicket(ticketNumber())
    }, 1000)
  }

  if (ticket) {
    return (
      <div className="flex animate-fade-up flex-col items-center rounded-xl border border-line bg-surface px-6 py-10 text-center">
        <Mascot mood="love" size={116} say="Thank you!" />
        <h3 className="mt-4 text-xl font-bold tracking-tight">Report received</h3>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
          Reference <span className="tabular font-semibold text-ink">{ticket}</span>. {diagnostics ? 'Diagnostic info was attached, which helps us fix it faster.' : 'No diagnostic info was attached.'}
        </p>
        <p className="mt-3 text-xs text-faint">Demo only — nothing was actually sent.</p>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => {
            setTicket(null)
            setCategory(null)
            setDescription('')
          }}
        >
          Report another problem
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted">What went wrong?</legend>
        <div className="flex flex-wrap gap-2">
          {problemCategories.map((c) => {
            const on = category === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setCategory(c)
                  setError(null)
                }}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-left text-[13px] font-semibold transition-all duration-200 active:scale-95',
                  on ? 'border-brand-500/50 bg-brand-500/15 text-brand-300' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {c}
              </button>
            )
          })}
        </div>
      </fieldset>
      <TextArea label="What happened?" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What were you doing, what did you expect, and what happened instead?" maxLength={1000} />
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Include diagnostic info</p>
          <p className="text-[13px] text-faint">{diagnostics ? `App 0.9.0 · ${path.name} · Day ${progress.currentDay}` : 'Only your description will be sent'}</p>
        </div>
        <Toggle label="Include diagnostic info" checked={diagnostics} onChange={setDiagnostics} />
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" full size="lg" loading={loading}>
        {loading ? 'Submitting…' : 'Submit report'}
      </Button>
    </form>
  )
}
