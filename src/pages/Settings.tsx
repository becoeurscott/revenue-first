import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Bell, CalendarCheck, CalendarClock, Clock, Crown, Database, FastForward, FileText, Globe, KeyRound, LifeBuoy, MessageCircle, MonitorSmartphone, Moon, RotateCcw, Shield, ShieldCheck, SkipForward, Sun, User, WifiOff } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { LegalSheet } from '@/components/domain/LegalSheet'
import { EditProfileSheet } from '@/components/domain/ProfileSheets'
import { DataSheet, OptionSheet, PasswordSheet, SessionsSheet } from '@/components/domain/SettingsSheets'
import { Badge } from '@/components/ui/Badge'
import { ListGroup, ListRow } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Inputs'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { TOTAL_DAYS } from '@/data/missions'
import { plans } from '@/data/subscription'
import { useProgram } from '@/store/selectors'
import { useApp, type Settings as AppSettings, type SubscriptionStatus } from '@/store/useApp'

type Overlay = 'profile' | 'password' | 'reminder' | 'language' | 'privacy' | 'terms' | 'data' | 'sessions' | 'subState' | 'jump' | 'jump30' | 'reset' | null

const REMINDER_TIMES = ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '6:00 PM', '8:00 PM', '9:00 PM'].map((value) => ({ value }))
const LANGUAGES = ['English', 'Español', 'Français', 'Deutsch', 'Português'].map((value) => ({ value }))
const JUMP_DAYS = [
  { value: '1', label: 'Day 1', hint: 'Fresh start of the program' },
  { value: '7', label: 'Day 7', hint: 'End of week 1' },
  { value: '14', label: 'Day 14', hint: 'Outreach in full swing' },
  { value: '21', label: 'Day 21', hint: 'Conversations and closing' },
  { value: '29', label: 'Day 29', hint: 'One day before the finish' },
] as const
const SUB_STATES: readonly { value: SubscriptionStatus; label: string; hint: string }[] = [
  { value: 'active', label: 'Active', hint: 'Premium unlocked everywhere' },
  { value: 'expired', label: 'Expired', hint: 'Shows renewal prompts and locked features' },
  { value: 'none', label: 'None', hint: 'Free account — shows the full paywall' },
]

const icon = 'size-4.5'
type ToggleKey = 'push' | 'dailyReminders' | 'weeklyCheckins' | 'coachMessages'

export default function Settings() {
  const navigate = useNavigate()
  const user = useApp((s) => s.user)
  const settings = useApp((s) => s.settings)
  const subscription = useApp((s) => s.subscription)
  const updateSettings = useApp((s) => s.updateSettings)
  const setSubscriptionStatus = useApp((s) => s.setSubscriptionStatus)
  const jumpToDay = useApp((s) => s.jumpToDay)
  const resetDemo = useApp((s) => s.resetDemo)
  const { progress } = useProgram()
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [twoFactor, setTwoFactor] = useState(false)
  const close = () => setOverlay(null)

  const set = (patch: Partial<AppSettings>, message?: string) => {
    updateSettings(patch)
    if (message) toast.success(message)
  }
  const toggleRow = (key: ToggleKey, title: string, detail: string, rowIcon: ReactNode) => (
    <ListRow
      icon={rowIcon}
      title={title}
      detail={detail}
      right={<Toggle label={title} checked={settings[key]} onChange={(v) => set({ [key]: v } as Partial<AppSettings>, `${title} ${v ? 'on' : 'off'}`)} />}
    />
  )

  const planName = plans.find((p) => p.id === subscription.plan)?.name
  const subDetail = subscription.status === 'active' ? `Premium${planName ? ` · ${planName}` : ''}` : subscription.status === 'expired' ? 'Expired' : 'Free plan'
  const dark = settings.theme === 'dark'

  const jump = (day: number) => {
    jumpToDay(day)
    toast.success(`Jumped to Day ${day}`)
    navigate('/home')
  }

  return (
    <Page title="Settings" back>
      <div className="grid gap-6 pb-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="space-y-6">
          <ListGroup title="Account">
            <ListRow icon={<User className={icon} aria-hidden />} title="Name" detail={user.name || 'Add your name'} onClick={() => setOverlay('profile')} />
            <ListRow icon={<AtSign className={icon} aria-hidden />} title="Email" detail={user.email || 'Add your email'} onClick={() => setOverlay('profile')} />
            <ListRow icon={<KeyRound className={icon} aria-hidden />} title="Change password" onClick={() => setOverlay('password')} />
          </ListGroup>

          <ListGroup title="Notifications">
            {toggleRow('push', 'Push notifications', 'Replies, payments and milestones', <Bell className={icon} aria-hidden />)}
            {toggleRow('dailyReminders', 'Daily reminders', 'A nudge to do today’s mission', <CalendarClock className={icon} aria-hidden />)}
            {toggleRow('weeklyCheckins', 'Weekly check-ins', 'A 3-minute review every 7 days', <CalendarCheck className={icon} aria-hidden />)}
            {toggleRow('coachMessages', 'Coach messages', 'Tips and answers from your coach', <MessageCircle className={icon} aria-hidden />)}
            <ListRow icon={<Clock className={icon} aria-hidden />} title="Reminder time" detail={settings.dailyReminders ? settings.reminderTime : 'Daily reminders are off'} onClick={() => setOverlay('reminder')} />
          </ListGroup>

          <ListGroup title="Appearance">
            <ListRow
              icon={dark ? <Moon className={icon} aria-hidden /> : <Sun className={icon} aria-hidden />}
              title="Dark mode"
              detail={dark ? 'On' : 'Off — using the light theme'}
              right={<Toggle label="Dark mode" checked={dark} onChange={(v) => set({ theme: v ? 'dark' : 'light' }, v ? 'Dark mode on' : 'Light mode on')} />}
            />
            <ListRow icon={<Globe className={icon} aria-hidden />} title="Language" detail={settings.language} onClick={() => setOverlay('language')} />
          </ListGroup>

          <ListGroup title="Privacy">
            <ListRow icon={<Shield className={icon} aria-hidden />} title="Privacy policy" onClick={() => setOverlay('privacy')} />
            <ListRow icon={<FileText className={icon} aria-hidden />} title="Terms of service" onClick={() => setOverlay('terms')} />
            <ListRow icon={<Database className={icon} aria-hidden />} title="Your data" detail="Stored locally · Export anytime" onClick={() => setOverlay('data')} />
          </ListGroup>
        </div>

        <div className="space-y-6">
          <ListGroup title="Security">
            <ListRow
              icon={<ShieldCheck className={icon} aria-hidden />}
              title="Two-factor authentication"
              detail={twoFactor ? 'On · Code sent by email' : 'Off'}
              right={
                <Toggle
                  label="Two-factor authentication"
                  checked={twoFactor}
                  onChange={(v) => {
                    setTwoFactor(v)
                    if (v) toast.success('Two-factor authentication on (demo)')
                    else toast.info('Two-factor authentication off (demo)')
                  }}
                />
              }
            />
            <ListRow icon={<MonitorSmartphone className={icon} aria-hidden />} title="Active sessions" detail="Manage signed-in devices" onClick={() => setOverlay('sessions')} />
          </ListGroup>

          <ListGroup title="Subscription">
            <ListRow icon={<Crown className={icon} aria-hidden />} title="Manage subscription" detail={subDetail} to="/subscription" />
          </ListGroup>

          <ListGroup title="Help">
            <ListRow icon={<LifeBuoy className={icon} aria-hidden />} title="Help & support" detail="FAQ, contact and problem reports" to="/help" />
          </ListGroup>

          <section aria-labelledby="proto-controls">
            <div className="mb-2 flex items-center gap-2 px-1">
              <h3 id="proto-controls" className="text-xs font-semibold tracking-wider text-faint uppercase">Prototype controls</h3>
              <Badge tone="warning">Demo</Badge>
            </div>
            <div className="rounded-xl border border-dashed border-warning/30 p-1">
              <ListGroup>
                <ListRow
                  icon={<WifiOff className={icon} aria-hidden />}
                  title="Simulate offline"
                  detail="Coach, generator and checkout will fail"
                  right={
                    <Toggle
                      label="Simulate offline"
                      checked={settings.offline}
                      onChange={(v) => {
                        updateSettings({ offline: v })
                        if (v) toast.warning('Offline mode on — network actions will fail')
                        else toast.success('Back online')
                      }}
                    />
                  }
                />
                <ListRow icon={<Crown className={icon} aria-hidden />} title="Subscription state" detail={SUB_STATES.find((s) => s.value === subscription.status)?.label} onClick={() => setOverlay('subState')} />
                <ListRow icon={<FastForward className={icon} aria-hidden />} title="Jump to Day 30" detail="See the finish line and completion flow" onClick={() => setOverlay('jump30')} />
                <ListRow icon={<SkipForward className={icon} aria-hidden />} title="Jump to day…" detail={`Currently on Day ${progress.currentDay}`} onClick={() => setOverlay('jump')} />
                <ListRow icon={<RotateCcw className={icon} aria-hidden />} title="Reset demo data" danger onClick={() => setOverlay('reset')} />
              </ListGroup>
            </div>
          </section>
        </div>
      </div>

      <p className="pb-8 text-center text-xs text-faint">FirstRevenue 0.9.0 (prototype) · All data is fictitious</p>

      <EditProfileSheet open={overlay === 'profile'} onClose={close} />
      <PasswordSheet open={overlay === 'password'} onClose={close} />
      <OptionSheet open={overlay === 'reminder'} onClose={close} title="Reminder time" description="When should we nudge you to do today's mission?" options={REMINDER_TIMES} value={settings.reminderTime} onSelect={(v) => set({ reminderTime: v, dailyReminders: true }, `Daily reminder set for ${v}`)} />
      <OptionSheet open={overlay === 'language'} onClose={close} title="Language" description="Lessons and missions are in English in this prototype." options={LANGUAGES} value={settings.language} onSelect={(v) => set({ language: v }, `Language set to ${v}`)} />
      <LegalSheet doc="privacy" open={overlay === 'privacy'} onClose={close} />
      <LegalSheet doc="terms" open={overlay === 'terms'} onClose={close} />
      <DataSheet open={overlay === 'data'} onClose={close} />
      <SessionsSheet open={overlay === 'sessions'} onClose={close} />
      <OptionSheet
        open={overlay === 'subState'}
        onClose={close}
        title="Subscription state"
        description="Switch states to preview the paywall, manage and expired screens."
        options={SUB_STATES}
        value={subscription.status}
        onSelect={(v) => {
          setSubscriptionStatus(v)
          toast.success(`Subscription state: ${v}`)
        }}
      />
      <OptionSheet open={overlay === 'jump'} onClose={close} title="Jump to day…" description="Earlier days are marked complete so the plan looks realistic." options={JUMP_DAYS} value={null} onSelect={(v) => jump(Number(v))} />
      <ConfirmDialog open={overlay === 'jump30'} onClose={close} onConfirm={() => jump(TOTAL_DAYS)} title="Jump to Day 30?" description="Days 1–29 will be marked complete on your current path. You can undo this with Reset demo data." confirmLabel="Jump to Day 30" />
      <ConfirmDialog
        open={overlay === 'reset'}
        onClose={close}
        onConfirm={() => {
          resetDemo()
          toast.success('Demo data reset — welcome back, Alex')
          navigate('/home')
        }}
        title="Reset demo data?"
        description="This replaces everything with the original demo account (Alex Carter, Day 7). Anything you added will be lost."
        confirmLabel="Reset everything"
        variant="danger"
      />
    </Page>
  )
}
