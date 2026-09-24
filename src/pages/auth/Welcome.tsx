import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarCheck, MessageSquareText, Sparkles } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Logo } from '@/components/layout/Logo'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'

const points = [
  { icon: CalendarCheck, text: 'One clear mission every day' },
  { icon: Sparkles, text: 'An AI coach for every question' },
  { icon: MessageSquareText, text: 'Outreach written with you' },
]

export default function Welcome() {
  const navigate = useNavigate()
  return (
    <AuthLayout
      footer={
        <div className="space-y-3">
          <Button size="lg" full onClick={() => navigate('/signup')} iconRight={<ArrowRight className="size-5" aria-hidden />}>
            Get Started
          </Button>
          <Button size="lg" variant="ghost" full onClick={() => navigate('/login')}>
            I Already Have an Account
          </Button>
        </div>
      }
    >
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
        <Mascot mood="wink" size={148} say="Tap me. I don't bite." tapLines={['30 days. One mission a day.', 'Less theory. More action.', 'Ready when you are!']} />
        <h1 className="mt-5 text-[38px] leading-[1.05] font-extrabold tracking-tight">
          Earn your first <span className="text-brand-gradient">money online.</span>
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">No experience required. Pick a path. Follow the plan. Take action every day.</p>
        <ul className="stagger mt-6 w-full space-y-2.5 text-left">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-lg border border-line bg-surface/70 px-4 py-3 text-sm font-medium">
              <Icon className="size-4.5 text-brand-300" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </AuthLayout>
  )
}
