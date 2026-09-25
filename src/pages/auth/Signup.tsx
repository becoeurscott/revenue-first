import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Lock, Mail, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/useApp'
import { SocialButtons } from './SocialButtons'

export default function Signup() {
  const navigate = useNavigate()
  const signup = useApp((s) => s.signup)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password' | 'agree', string>>>({})
  const [loading, setLoading] = useState(false)
  const [legal, setLegal] = useState<string | null>(null)

  const create = (name: string, email: string) => {
    setLoading(true)
    setTimeout(() => {
      signup(name, email)
      navigate('/onboarding', { replace: true })
    }, 350)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (form.name.trim().length < 2) next.name = 'Tell us your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (!agree) next.agree = 'Please accept the terms to continue.'
    setErrors(next)
    if (!Object.keys(next).length) create(form.name.trim(), form.email.trim())
  }

  const strength = Math.min(4, Math.floor(form.password.length / 3))

  return (
    <AuthLayout back="/welcome">
      <h1 className="mt-4 text-[32px] leading-tight font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-2 text-[15px] text-muted">Two minutes from now you'll have a 30-day plan.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <TextField label="Name" autoComplete="name" placeholder="Alex Carter" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} icon={<User className="size-4.5" aria-hidden />} />
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} icon={<Mail className="size-4.5" aria-hidden />} />
        <div>
          <TextField label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} icon={<Lock className="size-4.5" aria-hidden />} />
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? (strength < 3 ? 'bg-warning' : 'bg-success') : 'bg-surface-3')} />
            ))}
          </div>
        </div>

        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1 text-sm text-muted">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="peer sr-only" />
            <span className={cn('mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-md border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400', agree ? 'bg-brand-gradient border-transparent text-white' : 'border-line-strong bg-surface')}>
              {agree && <Check className="size-3.5" aria-hidden />}
            </span>
            <span>
              I agree to the{' '}
              <button type="button" onClick={(e) => { e.preventDefault(); setLegal('Terms of Service') }} className="font-semibold text-brand-300 underline-offset-2 hover:underline">Terms of Service</button> and{' '}
              <button type="button" onClick={(e) => { e.preventDefault(); setLegal('Privacy Policy') }} className="font-semibold text-brand-300 underline-offset-2 hover:underline">Privacy Policy</button>.
            </span>
          </label>
          {errors.agree && <p role="alert" className="mt-1 text-[13px] text-danger">{errors.agree}</p>}
        </div>

        <Button type="submit" size="lg" full loading={loading}>Create Account</Button>
      </form>

      <SocialButtons onContinue={() => create('', 'you@social-login.demo')} disabled={loading} />

      <p className="mt-6 pb-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-400">Log in</Link>
      </p>
      <Sheet open={!!legal} onClose={() => setLegal(null)} title={legal ?? ''} description="Prototype summary" footer={<Button full onClick={() => setLegal(null)}>Got it</Button>}>
        <div className="space-y-3 text-sm leading-relaxed text-muted">
          <p>FirstRevenue is a prototype. Every name, business, message and dollar amount you see is fictitious.</p>
          <p>Nothing you enter leaves this device: your progress is stored in your browser's local storage and can be reset at any time from Settings.</p>
          <p>No payment is ever taken, and income examples are illustrations — not guarantees of earnings.</p>
        </div>
      </Sheet>
    </AuthLayout>
  )
}
