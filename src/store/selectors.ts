import { useMemo } from 'react'
import { TOTAL_DAYS, getDay, plans } from '@/data/missions'
import { paths } from '@/data/paths'
import type { DayPlan, ProspectStatus, StatsSnapshot } from '@/data/types'
import { useApp } from './useApp'

export const REPLIED_STATUSES: ProspectStatus[] = ['Replied', 'Interested', 'Negotiating', 'Won']

/** Everything the UI needs to know about "where am I in the program". */
export function useProgram() {
  const pathId = useApp((s) => s.pathId)
  const progress = useApp((s) => s.progress[s.pathId])
  const tasks = useApp((s) => s.tasks)
  return useMemo(() => {
    const path = paths[pathId]
    const plan = plans[pathId]
    const today = getDay(pathId, progress.currentDay) as DayPlan
    const todayDone = progress.completedDays.includes(progress.currentDay)
    const tasksDone = today.tasks.filter((t) => tasks[t.id]).length
    const finished = progress.completedDays.length >= TOTAL_DAYS
    return { pathId, path, plan, progress, today, todayDone, tasksDone, finished, totalDays: TOTAL_DAYS }
  }, [pathId, progress, tasks])
}

export type DayStatus = 'completed' | 'today' | 'in-progress' | 'locked'

export function useDayStatus() {
  const { progress, plan } = useProgram()
  const tasks = useApp((s) => s.tasks)
  return (day: number): DayStatus => {
    if (progress.completedDays.includes(day)) return 'completed'
    if (day > progress.currentDay) return 'locked'
    const started = plan.find((d) => d.day === day)?.tasks.some((t) => tasks[t.id])
    return started ? 'in-progress' : 'today'
  }
}

export function useStats(): StatsSnapshot & { potential: number; booked: number; conversion: number; xp: number; longestStreak: number; level: number; levelProgress: number } {
  const s = useApp()
  return useMemo(() => {
    const daysCompleted = s.progress[s.pathId].completedDays.length
    const missions = s.progress.clipping.completedDays.length + s.progress.gbp.completedDays.length
    const contacted = s.prospects.filter((p) => p.status !== 'New').length
    const replies = s.prospects.filter((p) => REPLIED_STATUSES.includes(p.status)).length
    const clients = s.prospects.filter((p) => p.status === 'Won').length
    const sum = (status: string) => s.deals.filter((d) => d.status === status).reduce((t, d) => t + d.amount, 0)
    const level = Math.floor(s.xp / 400) + 1
    return {
      missions,
      daysCompleted,
      lessons: s.completedLessons.length,
      streak: s.streak,
      longestStreak: s.longestStreak,
      prospects: s.prospects.length,
      contacted,
      replies,
      clients,
      revenue: sum('Collected'),
      booked: sum('Booked'),
      potential: sum('Potential'),
      conversion: contacted ? Math.round((clients / contacted) * 100) : 0,
      xp: s.xp,
      level,
      levelProgress: (s.xp % 400) / 400,
    }
  }, [s])
}

export function usePremium(): boolean {
  return useApp((s) => s.subscription.status === 'active')
}

export function useUnreadCount(): number {
  return useApp((s) => s.notifications.filter((n) => !n.read).length)
}
