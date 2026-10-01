import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedConversations } from '@/data/coach'
import { TOTAL_DAYS, getDay } from '@/data/missions'
import { seedNotifications } from '@/data/notifications'
import { seedProspects } from '@/data/prospects'
import { seedDeals } from '@/data/revenue'
import { emptyAnswers, mockAnswers, mockUser } from '@/data/users'
import type {
  AppNotification,
  ChatMessage,
  CoachConversation,
  ContactEvent,
  Deal,
  DealStatus,
  OnboardingAnswers,
  OutreachTemplate,
  PathId,
  Playbook,
  Prospect,
  ProspectStatus,
  UserProfile,
  WeeklyCheckin,
} from '@/data/types'
import { dayKey, daysAgo, daysFromNow, nowIso } from '@/lib/date'

/**
 * Single client-side store, persisted to localStorage.
 * This is the seam where a real backend plugs in later: every mutation below
 * maps to one API call, and the state shape mirrors what that API would return.
 */

export type TaskState = 'done' | 'skipped'
export type SubscriptionStatus = 'none' | 'active' | 'expired'

export interface PathProgress {
  currentDay: number
  completedDays: number[]
}

export interface Settings {
  push: boolean
  dailyReminders: boolean
  weeklyCheckins: boolean
  coachMessages: boolean
  theme: 'dark' | 'light'
  language: string
  reminderTime: string
  /** demo switch: simulates losing the connection */
  offline: boolean
}

interface Snapshot {
  authed: boolean
  onboarded: boolean
  user: UserProfile
  answers: OnboardingAnswers
  pathId: PathId
  subscription: { status: SubscriptionStatus; plan: 'monthly' | 'yearly' | null; renews: string | null }
  progress: Record<PathId, PathProgress>
  tasks: Record<string, TaskState>
  taskNotes: Record<string, string>
  completedLessons: string[]
  savedLessons: string[]
  recentLessons: string[]
  savedResources: string[]
  xp: number
  streak: number
  longestStreak: number
  activeDays: string[]
  prospects: Prospect[]
  deals: Deal[]
  notifications: AppNotification[]
  conversations: CoachConversation[]
  customTemplates: OutreachTemplate[]
  checkins: WeeklyCheckin[]
  recentSearches: string[]
  settings: Settings
  playbook: Playbook | null
}

interface Actions {
  login: () => void
  signup: (name: string, email: string) => void
  logout: () => void
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
  completeOnboarding: (pathId: PathId) => void
  subscribe: (plan: 'monthly' | 'yearly') => void
  setSubscriptionStatus: (status: SubscriptionStatus) => void

  setTask: (taskId: string, state: TaskState | null) => void
  setTaskNote: (taskId: string, note: string) => void
  completeMission: (day: number) => void
  advanceDay: () => void

  completeLesson: (id: string) => void
  toggleSavedLesson: (id: string) => void
  touchLesson: (id: string) => void
  toggleSavedResource: (id: string) => void

  addProspect: (p: Omit<Prospect, 'id' | 'notes' | 'history' | 'lastContact' | 'followUp' | 'status'> & { status?: ProspectStatus }) => string
  setProspectStatus: (id: string, status: ProspectStatus) => void
  addProspectNote: (id: string, text: string) => void
  setFollowUp: (id: string, days: number | null) => void
  logOutreach: (id: string, text: string) => void
  removeProspect: (id: string) => void

  addDeal: (d: Omit<Deal, 'id' | 'date' | 'path'>) => void
  setDealStatus: (id: string, status: DealStatus) => void

  toggleNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void

  startConversation: (text: string) => string
  addChatMessage: (conversationId: string, from: ChatMessage['from'], text: string) => void
  deleteConversation: (id: string) => void

  saveTemplate: (title: string, body: string) => void
  deleteTemplate: (id: string) => void
  addCheckin: (c: Omit<WeeklyCheckin, 'id' | 'date'>) => void

  setNiche: (niche: string) => void
  setPlaybook: (playbook: Playbook | null) => void

  addRecentSearch: (q: string) => void
  clearRecentSearches: () => void

  updateProfile: (patch: Partial<UserProfile>) => void
  updateSettings: (patch: Partial<Settings>) => void
  switchPath: (pathId: PathId) => void

  jumpToDay: (day: number) => void
  resetDemo: () => void
}

export type AppState = Snapshot & Actions

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const defaultSettings: Settings = {
  push: true,
  dailyReminders: true,
  weeklyCheckins: true,
  coachMessages: true,
  theme: 'dark',
  language: 'English',
  reminderTime: '9:00 AM',
  offline: false,
}

/** Brand-new account: Day 1, nothing done. Showcases empty states. */
function freshSnapshot(): Snapshot {
  return {
    authed: false,
    onboarded: false,
    user: { ...mockUser, name: '', email: '', skills: [], joined: nowIso() },
    answers: { ...emptyAnswers },
    pathId: 'clipping',
    subscription: { status: 'none', plan: null, renews: null },
    progress: {
      clipping: { currentDay: 1, completedDays: [] },
      gbp: { currentDay: 1, completedDays: [] },
    },
    tasks: {},
    taskNotes: {},
    completedLessons: [],
    savedLessons: [],
    recentLessons: [],
    savedResources: [],
    xp: 0,
    streak: 0,
    longestStreak: 0,
    activeDays: [],
    prospects: [],
    deals: [],
    notifications: [],
    conversations: [],
    customTemplates: [],
    checkins: [],
    recentSearches: [],
    playbook: null,
    settings: { ...defaultSettings },
  }
}

/** Alex Carter on Day 7 — the returning-user demo account. */
function demoSnapshot(): Snapshot {
  const doneTasks: Record<string, TaskState> = {}
  for (let day = 1; day <= 6; day++) {
    for (const t of getDay('clipping', day)?.tasks ?? []) doneTasks[t.id] = 'done'
  }
  // Day 7 is already in progress: 3 / 5 tasks done.
  for (const t of (getDay('clipping', 7)?.tasks ?? []).slice(0, 3)) doneTasks[t.id] = 'done'

  return {
    ...freshSnapshot(),
    authed: true,
    onboarded: true,
    user: { ...mockUser },
    answers: { ...mockAnswers },
    pathId: 'clipping',
    subscription: { status: 'active', plan: 'yearly', renews: daysFromNow(359) },
    progress: {
      clipping: { currentDay: 7, completedDays: [1, 2, 3, 4, 5, 6] },
      gbp: { currentDay: 1, completedDays: [] },
    },
    tasks: doneTasks,
    completedLessons: ['clip-01', 'clip-02', 'clip-03', 'clip-04', 'clip-05', 'gen-01'],
    savedLessons: ['clip-04', 'gen-02'],
    recentLessons: ['clip-06', 'clip-05', 'gen-01'],
    savedResources: ['res-cold-outreach', 'res-pricing-calculator'],
    xp: 650,
    streak: 6,
    longestStreak: 6,
    activeDays: [6, 5, 4, 3, 2, 1].map((n) => dayKey(daysAgo(n))),
    prospects: seedProspects.filter((p) => p.path === 'clipping').map((p) => structuredClone(p)),
    deals: seedDeals.map((d) => ({ ...d })),
    notifications: seedNotifications.map((n) => ({ ...n })),
    conversations: seedConversations.map((c) => structuredClone(c)),
    recentSearches: ['outreach template', 'pricing', 'follow-up'],
    playbook: null,
  }
}

function notify(list: AppNotification[], n: Omit<AppNotification, 'id' | 'date' | 'read'>): AppNotification[] {
  return [{ ...n, id: uid('n'), date: nowIso(), read: false }, ...list]
}

const event = (kind: ContactEvent['kind'], text: string): ContactEvent => ({ id: uid('e'), kind, text, date: nowIso() })

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...freshSnapshot(),

      login: () => set((s) => (s.onboarded && s.user.name ? { authed: true } : demoSnapshot())),
      signup: (name, email) =>
        set({ ...freshSnapshot(), authed: true, user: { ...freshSnapshot().user, name, email }, answers: { ...emptyAnswers, name: name.split(' ')[0] } }),
      logout: () => set({ authed: false }),

      setAnswer: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),

      completeOnboarding: (pathId) =>
        set((s) => {
          const a = s.answers
          const goalAmount = Number(a.goal.replace(/[^0-9]/g, '')) || 500
          return {
            onboarded: true,
            pathId,
            user: {
              ...s.user,
              name: s.user.name || a.name,
              role: a.role,
              skills: a.skills,
              experience: a.experience,
              budget: a.budget,
              time: a.time,
              goal: a.goal,
              goalAmount,
              confidence: a.comfort,
            },
            notifications: notify(s.notifications, {
              emoji: '🚀',
              title: 'Your 30-day plan is ready',
              body: 'Day 1 is unlocked. It takes about 20 minutes — start while the motivation is fresh.',
              link: '/plan/day/1',
            }),
          }
        }),

      subscribe: (plan) =>
        set({ subscription: { status: 'active', plan, renews: daysFromNow(plan === 'yearly' ? 365 : 30) } }),
      setSubscriptionStatus: (status) => set((s) => ({ subscription: { ...s.subscription, status } })),

      setTask: (taskId, state) =>
        set((s) => {
          const tasks = { ...s.tasks }
          if (state) tasks[taskId] = state
          else delete tasks[taskId]
          return { tasks }
        }),
      setTaskNote: (taskId, note) => set((s) => ({ taskNotes: { ...s.taskNotes, [taskId]: note } })),

      completeMission: (day) =>
        set((s) => {
          const p = s.progress[s.pathId]
          if (p.completedDays.includes(day)) return s
          const plan = getDay(s.pathId, day)
          const streak = s.streak + 1
          // First free calendar slot from today onward (lets the demo run several days in one sitting).
          const active = new Set(s.activeDays)
          let offset = 0
          while (active.has(dayKey(daysFromNow(offset)))) offset++
          active.add(dayKey(daysFromNow(offset)))

          let notifications = notify(s.notifications, {
            emoji: '🎬',
            title: 'You unlocked a new lesson',
            body: `Day ${day} mission complete. Your lesson is ready to watch.`,
            link: plan ? `/lessons/${plan.lessonId}` : '/lessons',
          })
          if (streak === 3 || streak === 7 || streak === 14 || streak === 30) {
            notifications = notify(notifications, {
              emoji: '🔥',
              title: `${streak}-day streak!`,
              body: 'Consistency is the whole game. Keep it alive tomorrow.',
              link: '/streak',
            })
          }
          if (day % 7 === 0 && day < TOTAL_DAYS) {
            notifications = notify(notifications, {
              emoji: '📝',
              title: 'Your weekly check-in is ready',
              body: `Week ${day / 7} is done. Take 3 minutes to reflect and set next week's focus.`,
              link: '/check-in',
            })
          }
          return {
            progress: { ...s.progress, [s.pathId]: { ...p, completedDays: [...p.completedDays, day].sort((a, b) => a - b) } },
            xp: s.xp + (plan?.xp ?? 100),
            streak,
            longestStreak: Math.max(s.longestStreak, streak),
            activeDays: [...active],
            notifications,
          }
        }),

      advanceDay: () =>
        set((s) => {
          const p = s.progress[s.pathId]
          if (!p.completedDays.includes(p.currentDay) || p.currentDay >= TOTAL_DAYS) return s
          return { progress: { ...s.progress, [s.pathId]: { ...p, currentDay: p.currentDay + 1 } } }
        }),

      completeLesson: (id) =>
        set((s) => (s.completedLessons.includes(id) ? s : { completedLessons: [...s.completedLessons, id], xp: s.xp + 25 })),
      toggleSavedLesson: (id) =>
        set((s) => ({ savedLessons: s.savedLessons.includes(id) ? s.savedLessons.filter((x) => x !== id) : [id, ...s.savedLessons] })),
      touchLesson: (id) => set((s) => ({ recentLessons: [id, ...s.recentLessons.filter((x) => x !== id)].slice(0, 8) })),
      toggleSavedResource: (id) =>
        set((s) => ({
          savedResources: s.savedResources.includes(id) ? s.savedResources.filter((x) => x !== id) : [id, ...s.savedResources],
        })),

      addProspect: (input) => {
        const id = uid('p')
        set((s) => ({
          prospects: [
            {
              ...input,
              id,
              status: input.status ?? 'New',
              lastContact: null,
              followUp: null,
              notes: [],
              history: [event('status', 'Added to your prospect list')],
            },
            ...s.prospects,
          ],
        }))
        return id
      },

      setProspectStatus: (id, status) =>
        set((s) => {
          const prospect = s.prospects.find((p) => p.id === id)
          if (!prospect || prospect.status === status) return s
          const prospects = s.prospects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status,
                  lastContact: status === 'New' ? p.lastContact : nowIso(),
                  history: [event('status', `Marked as ${status}`), ...p.history],
                }
              : p,
          )

          // Keep the revenue pipeline in sync with the CRM.
          let deals = s.deals
          let notifications = s.notifications
          const open = deals.find((d) => d.prospectId === id && d.status === 'Potential')
          const service = prospect.gbp?.service ?? (prospect.path === 'clipping' ? 'Clip starter pack' : 'Profile optimization')
          if (['Interested', 'Negotiating'].includes(status) && !open) {
            deals = [{ id: uid('d'), prospectId: id, path: prospect.path, client: prospect.name, service, amount: prospect.value, status: 'Potential', date: nowIso() }, ...deals]
          }
          if (status === 'Won') {
            deals = open
              ? deals.map((d) => (d.id === open.id ? { ...d, status: 'Booked' as const, date: nowIso() } : d))
              : [{ id: uid('d'), prospectId: id, path: prospect.path, client: prospect.name, service, amount: prospect.value, status: 'Booked', date: nowIso() }, ...deals]
            notifications = notify(notifications, {
              emoji: '🏆',
              title: `You won ${prospect.business}!`,
              body: `$${prospect.value} booked. Send the invoice, then mark it collected in your revenue tracker.`,
              link: '/revenue',
            })
          }
          if (status === 'Lost' && open) deals = deals.filter((d) => d.id !== open.id)
          return { prospects, deals, notifications }
        }),

      addProspectNote: (id, text) =>
        set((s) => ({
          prospects: s.prospects.map((p) =>
            p.id === id ? { ...p, notes: [{ id: uid('note'), text, date: nowIso() }, ...p.notes], history: [event('note', 'Added a note'), ...p.history] } : p,
          ),
        })),

      setFollowUp: (id, days) =>
        set((s) => ({
          prospects: s.prospects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  followUp: days === null ? null : daysFromNow(days),
                  history: days === null ? p.history : [event('followup', `Follow-up set for ${days === 1 ? 'tomorrow' : `in ${days} days`}`), ...p.history],
                }
              : p,
          ),
        })),

      logOutreach: (id, text) =>
        set((s) => ({
          prospects: s.prospects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: p.status === 'New' ? 'Contacted' : p.status,
                  lastContact: nowIso(),
                  history: [event('message', text), ...p.history],
                }
              : p,
          ),
        })),

      removeProspect: (id) => set((s) => ({ prospects: s.prospects.filter((p) => p.id !== id), deals: s.deals.filter((d) => d.prospectId !== id || d.status !== 'Potential') })),

      addDeal: (d) => set((s) => ({ deals: [{ ...d, id: uid('d'), path: s.pathId, date: nowIso() }, ...s.deals] })),
      setDealStatus: (id, status) =>
        set((s) => {
          const deal = s.deals.find((d) => d.id === id)
          if (!deal) return s
          return {
            deals: s.deals.map((d) => (d.id === id ? { ...d, status, date: nowIso() } : d)),
            notifications:
              status === 'Collected'
                ? notify(s.notifications, { emoji: '💸', title: `${deal.client} paid $${deal.amount}`, body: 'Money in the bank. Your revenue tracker is updated.', link: '/revenue' })
                : s.notifications,
          }
        }),

      toggleNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      startConversation: (text) => {
        const id = uid('c')
        const title = text.length > 42 ? `${text.slice(0, 42)}…` : text
        set((s) => ({ conversations: [{ id, title, date: nowIso(), messages: [] }, ...s.conversations] }))
        return id
      },
      addChatMessage: (conversationId, from, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, date: nowIso(), messages: [...c.messages, { id: uid('m'), from, text, date: nowIso() }] } : c,
          ),
        })),
      deleteConversation: (id) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),

      saveTemplate: (title, body) =>
        set((s) => ({ customTemplates: [{ id: uid('t'), path: s.pathId, title, stage: 'First touch', body, custom: true }, ...s.customTemplates] })),
      deleteTemplate: (id) => set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) })),

      addCheckin: (c) => set((s) => ({ checkins: [{ ...c, id: uid('w'), date: nowIso() }, ...s.checkins], xp: s.xp + 50 })),

      setNiche: (niche) => set((s) => ({ answers: { ...s.answers, niche }, playbook: null })),
      setPlaybook: (playbook) => set({ playbook }),

      addRecentSearch: (q) => set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6) })),
      clearRecentSearches: () => set({ recentSearches: [] }),

      updateProfile: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      switchPath: (pathId) =>
        set((s) =>
          s.pathId === pathId
            ? s
            : {
                pathId,
                notifications: notify(s.notifications, {
                  emoji: '🧭',
                  title: 'Path switched',
                  body: 'Your plan, lessons and resources now follow your new path. Progress on the old path is saved.',
                  link: '/plan',
                }),
              },
        ),

      jumpToDay: (day) =>
        set((s) => {
          const target = Math.min(Math.max(day, 1), TOTAL_DAYS)
          const completedDays = Array.from({ length: target - 1 }, (_, i) => i + 1)
          const tasks = { ...s.tasks }
          for (const d of completedDays) for (const t of getDay(s.pathId, d)?.tasks ?? []) tasks[t.id] = 'done'
          const streak = Math.max(s.streak, target - 1)
          return {
            progress: { ...s.progress, [s.pathId]: { currentDay: target, completedDays } },
            tasks,
            streak,
            longestStreak: Math.max(s.longestStreak, streak),
            activeDays: Array.from({ length: target - 1 }, (_, i) => dayKey(daysAgo(i + 1))),
          }
        }),

      resetDemo: () => set(demoSnapshot()),
    }),
    {
      name: 'firstrevenue:v1',
      version: 2,
      // v2 added the niche answer and the AI playbook.
      migrate: (persisted, version) => {
        const state = persisted as Partial<Snapshot>
        if (version < 2 && state.answers) state.answers = { ...state.answers, niche: state.answers.niche ?? '' }
        return { ...state, playbook: state.playbook ?? null } as AppState
      },
    },
  ),
)
