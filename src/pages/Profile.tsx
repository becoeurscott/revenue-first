import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BookOpen, ChevronRight, Compass, Crown, DollarSign, FolderOpen, LifeBuoy, LogOut, Pencil, Settings as SettingsIcon, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { EditProfileSheet, GoalsSheet, SkillsSheet } from '@/components/domain/ProfileSheets'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, ListGroup, ListRow } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { StatCard } from '@/components/ui/StatCard'
import { plans } from '@/data/subscription'
import { money } from '@/lib/cn'
import { useProgram, useStats, useUnreadCount } from '@/store/selectors'
import { useApp } from '@/store/useApp'

type Overlay = 'edit' | 'goals' | 'skills' | 'logout' | null

const XP_PER_LEVEL = 400
const icon = 'size-4.5'

export default function Profile() {
  const navigate = useNavigate()
  const user = useApp((s) => s.user)
  const subscription = useApp((s) => s.subscription)
  const logout = useApp((s) => s.logout)
  const { path, progress, totalDays } = useProgram()
  const stats = useStats()
  const unread = useUnreadCount()
  const [overlay, setOverlay] = useState<Overlay>(null)
  const close = () => setOverlay(null)

  const planName = plans.find((p) => p.id === subscription.plan)?.name
  const subscriptionDetail = subscription.status === 'active' ? `Premium${planName ? ` · ${planName}` : ''} · Active` : subscription.status === 'expired' ? 'Premium · Expired' : 'Free plan'
  const xpInLevel = stats.xp % XP_PER_LEVEL
  const displayName = user.name || 'Your profile'

  return (
    <Page
      title="Profile"
      large
      actions={
        <>
          <IconButton label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => navigate('/notifications')}>
            <Bell className="size-5" aria-hidden />
            {unread > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full border-2 border-surface bg-brand-400" aria-hidden />}
          </IconButton>
          <IconButton label="Settings" onClick={() => navigate('/settings')}>
            <SettingsIcon className="size-5" aria-hidden />
          </IconButton>
        </>
      }
    >
      <div className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8">
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card variant="hero" className="animate-fade-up">
            <div className="flex items-center gap-4">
              <Avatar name={displayName} size={72} className="ring-2 ring-brand-500/40 ring-offset-2 ring-offset-surface" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold tracking-tight">{displayName}</h2>
                <p className="truncate text-[13px] text-muted">{user.email || 'No email added'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{path.emoji} {path.name}</Badge>
                  <Badge><span className="tabular">Day {progress.currentDay} / {totalDays}</span></Badge>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                <span className="font-semibold">Level {stats.level}</span>
                <span className="tabular text-faint">{xpInLevel} / {XP_PER_LEVEL} XP</span>
              </div>
              <ProgressBar value={stats.levelProgress} label={`Level ${stats.level} progress`} />
            </div>
            <Button variant="secondary" full className="mt-4" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setOverlay('edit')}>
              Edit profile
            </Button>
          </Card>

          <div className="stagger grid grid-cols-3 gap-3">
            <StatCard value={stats.streak} label="Day streak" icon="🔥" to="/streak" className="p-3.5" />
            <StatCard value={stats.prospects} label="Prospects" icon="📇" to="/prospects" className="p-3.5" />
            <StatCard value={money(stats.revenue)} label="Revenue" icon="💵" to="/revenue" accent className="p-3.5" />
          </div>
        </div>

        <div className="space-y-6">
          <ListGroup title="About me">
            <ListRow icon={<Target className={icon} aria-hidden />} title="My Goals" detail={`${money(stats.revenue)} of ${user.goal || money(user.goalAmount)} earned`} onClick={() => setOverlay('goals')} />
            <ListRow icon={<Sparkles className={icon} aria-hidden />} title="My Skills" detail={user.skills.length ? user.skills.join(', ') : 'Add your skills'} onClick={() => setOverlay('skills')} />
            <ListRow icon={<Compass className={icon} aria-hidden />} title="My Path" detail={path.name} to="/paths" />
          </ListGroup>

          <ListGroup title="My journey">
            <ListRow icon={<TrendingUp className={icon} aria-hidden />} title="Progress" detail={`${stats.daysCompleted} of ${totalDays} days completed`} to="/progress" />
            <ListRow icon={<Trophy className={icon} aria-hidden />} title="Achievements" to="/achievements" />
            <ListRow icon={<DollarSign className={icon} aria-hidden />} title="Revenue" detail={`${money(stats.revenue)} collected`} to="/revenue" />
            <ListRow icon={<BookOpen className={icon} aria-hidden />} title="Lessons" detail={`${stats.lessons} completed`} to="/lessons" />
            <ListRow icon={<FolderOpen className={icon} aria-hidden />} title="Resources" to="/resources" />
          </ListGroup>

          <ListGroup title="Account">
            <ListRow
              icon={<Bell className={icon} aria-hidden />}
              title="Notifications"
              to="/notifications"
              right={
                <span className="flex shrink-0 items-center gap-2">
                  {unread > 0 && <Badge tone="brand"><span className="tabular">{unread} new</span></Badge>}
                  <ChevronRight className="size-4 text-faint" aria-hidden />
                </span>
              }
            />
            <ListRow icon={<Crown className={icon} aria-hidden />} title="Subscription" detail={subscriptionDetail} to="/subscription" />
            <ListRow icon={<SettingsIcon className={icon} aria-hidden />} title="Settings" to="/settings" />
            <ListRow icon={<LifeBuoy className={icon} aria-hidden />} title="Help" to="/help" />
          </ListGroup>

          <ListGroup>
            <ListRow icon={<LogOut className={icon} aria-hidden />} title="Log out" danger onClick={() => setOverlay('logout')} />
          </ListGroup>
        </div>
      </div>

      <EditProfileSheet open={overlay === 'edit'} onClose={close} />
      <GoalsSheet open={overlay === 'goals'} onClose={close} onEdit={() => setOverlay('edit')} />
      <SkillsSheet open={overlay === 'skills'} onClose={close} />
      <ConfirmDialog
        open={overlay === 'logout'}
        onClose={close}
        onConfirm={() => {
          logout()
          navigate('/welcome')
        }}
        title="Log out?"
        description="Your progress is saved on this device. You can log back in any time."
        confirmLabel="Log out"
        variant="danger"
      />
    </Page>
  )
}
