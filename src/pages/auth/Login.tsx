import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Inputs'
import { toast } from '@/components/ui/Toast'
import { mockUser } from '@/data/users'
import { useApp } from '@/store/useApp'
import { SocialButtons } from './SocialButtons'

export default function Login() {
  const navigate = useNavigate()
  const login = useApp((s) => s.login)
  const [email, setEmail] = useState(mockUser.email)
  const [password, setPassword] = useState('demo-password')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const signIn = () => {
    setLoading(true)
    setTimeout(() => {
      login()
      const first = useApp.getState().user.name.split(' ')[0]
      toast.success(`Welcome back, ${first}`)
      navigate('/home', { replace: true })
    }, 900)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 6) next.password = 'Password must be at least 6 characters.'
    setErrors(next)
    if (!Object.keys(next).length) signIn()
  }

  return (
    <AuthLayout back="/welcome">
      <h1 className="mt-4 text-[32px] leading-tight font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] text-muted">Pick up where you left off. Your streak is waiting.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} icon={<Mail className="size-4.5" aria-hidden />} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} icon={<Lock className="size-4.5" aria-hidden />} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-300 hover:text-brand-400">Forgot Password?</Link>
        </div>
        <Button type="submit" size="lg" full loading={loading}>Log In</Button>
      </form>

      <SocialButtons onContinue={signIn} disabled={loading} />

      <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-center text-[13px] leading-relaxed text-muted">
        Demo account is pre-filled. Logging in loads <span className="font-semibold text-ink">Alex Carter</span> on Day 7.
      </p>
      <p className="mt-6 pb-8 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-brand-300 hover:text-brand-400">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
