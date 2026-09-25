import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Inputs'
import { toast } from '@/components/ui/Toast'

/** Forgot password + reset-sent success state. */
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter the email you signed up with.')
    setError(undefined)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 400)
  }

  if (sent) {
    return (
      <AuthLayout footer={<Button size="lg" full onClick={() => navigate('/login')}>Back to Log In</Button>}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot mood="wink" size={140} />
          <span className="mt-6 flex size-12 animate-pop items-center justify-center rounded-full bg-success/15 text-success"><MailCheck className="size-6" aria-hidden /></span>
          <h1 className="mt-4 text-[28px] font-extrabold tracking-tight">Check your inbox</h1>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">
            We sent a reset link to <span className="font-semibold text-ink">{email}</span>. It expires in 30 minutes.
          </p>
          <button type="button" onClick={() => toast.info('Reset link sent again')} className="mt-6 min-h-11 text-sm font-semibold text-brand-300 hover:text-brand-400">
            Didn't get it? Resend
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout back="/login">
      <h1 className="mt-4 text-[32px] leading-tight font-extrabold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-[15px] text-muted">Enter your email and we'll send you a link to get back in.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} icon={<Mail className="size-4.5" aria-hidden />} />
        <Button type="submit" size="lg" full loading={loading}>Send Reset Link</Button>
      </form>
    </AuthLayout>
  )
}
