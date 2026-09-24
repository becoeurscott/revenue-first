/**
 * Shared domain types. The mock data layer (/src/data) and the store both
 * conform to these, so a real API can later return the same shapes.
 * ALL DATA IN THIS APP IS FICTITIOUS.
 */

export type PathId = 'clipping' | 'gbp'
export type PathScope = PathId | 'all'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface OnboardingAnswers {
  name: string
  role: string
  skills: string[]
  experience: string
  time: string
  budget: string
  comfort: string
  interest: string
  goal: string
  blocker: string
  learning: string
  commitment: string
}

export interface UserProfile {
  name: string
  email: string
  age: number
  role: string
  skills: string[]
  experience: string
  budget: string
  time: string
  goal: string
  /** numeric version of goal, in dollars */
  goalAmount: number
  confidence: string
  joined: string // ISO date
}

export interface OnboardingOption {
  value: string
  emoji: string
  hint?: string
}

export interface OnboardingStep {
  key: keyof OnboardingAnswers
  emoji: string
  title: string
  subtitle: string
  kind: 'text' | 'single' | 'multi'
  options?: OnboardingOption[]
  placeholder?: string
  /** What the mascot says on this step */
  mascotLine: string
}

export interface PathWeek {
  week: number
  title: string
  focus: string[]
}

export interface PathTool {
  name: string
  purpose: string
  cost: string
}

export interface PathInfo {
  id: PathId
  slug: string // route segment: /paths/<slug>
  name: string
  tagline: string
  emoji: string
  hue: number // drives gradients for thumbnails/hero
  description: string
  difficulty: Difficulty
  objective: string // 30-day objective
  service: string // what the user sells
  typicalPrice: string
  skills: string[]
  firstTasks: string[]
  workflow: string[]
  weeks: PathWeek[]
  tools: PathTool[]
}

export interface MissionTask {
  id: string
  title: string
  description: string
  resourceId?: string
}

export interface DayPlan {
  day: number
  week: number
  theme: string // e.g. "Build Your Prospect List"
  missionTitle: string // e.g. "Find 10 creators who publish long-form content."
  goal: string // e.g. "Find 10 potential clients."
  minutes: number
  difficulty: Difficulty
  xp: number
  lessonId: string
  tasks: MissionTask[]
}

export type LessonCategory =
  | 'Mindset'
  | 'Getting Started'
  | 'Finding Clients'
  | 'Outreach'
  | 'Sales'
  | 'Pricing'
  | 'Delivery'
  | 'Retention'
  | 'Clipping'
  | 'Google Business'
  | 'Productivity'

export interface Lesson {
  id: string
  title: string
  category: LessonCategory
  path: PathScope
  duration: string // "12:48"
  minutes: number
  hue: number // thumbnail gradient hue
  summary: string
  learn: string[]
  takeaways: string[]
  resourceIds: string[]
  instructor: string
}

export type ResourceType = 'Template' | 'Tool' | 'Guide' | 'Checklist' | 'Script' | 'Calculator'

export interface ResourceSection {
  heading: string
  /** paragraphs, or checklist items when the resource type is Checklist */
  body: string[]
}

export interface Resource {
  id: string
  title: string
  type: ResourceType
  path: PathScope
  description: string
  minutes: number
  sections: ResourceSection[]
  /** Optional in-app route for interactive resources, e.g. /pricing */
  link?: string
}

export type ProspectStatus = 'New' | 'Contacted' | 'Replied' | 'Interested' | 'Negotiating' | 'Won' | 'Lost'

export interface ProspectNote {
  id: string
  text: string
  date: string // ISO
}

export interface ContactEvent {
  id: string
  kind: 'message' | 'reply' | 'call' | 'status' | 'note' | 'followup'
  text: string
  date: string // ISO
}

export interface GbpAudit {
  rating: number
  reviews: number
  category: string
  city: string
  problems: string[]
  service: string
}

export interface Prospect {
  id: string
  path: PathId
  name: string // contact person
  business: string // creator brand or business name
  platform: string // YouTube, Podcast, Google Maps…
  audience: string // "52K subscribers" / "127 reviews"
  handle: string // @handle or email — fictitious
  about: string
  status: ProspectStatus
  lastContact: string | null // ISO
  followUp: string | null // ISO
  value: number // potential deal value in $
  notes: ProspectNote[]
  history: ContactEvent[]
  gbp?: GbpAudit
}

export type DealStatus = 'Potential' | 'Booked' | 'Collected'

export interface Deal {
  id: string
  prospectId?: string
  path: PathId
  client: string
  service: string
  amount: number
  status: DealStatus
  date: string // ISO
}

export interface OutreachTemplate {
  id: string
  path: PathScope
  title: string
  stage: 'First touch' | 'Follow-up' | 'Reply' | 'Closing'
  body: string
  custom?: boolean
}

export interface AppNotification {
  id: string
  emoji: string
  title: string
  body: string
  date: string // ISO
  read: boolean
  link: string
}

export interface StatsSnapshot {
  missions: number
  lessons: number
  streak: number
  prospects: number
  contacted: number
  replies: number
  clients: number
  revenue: number
  daysCompleted: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  emoji: string
  metric: keyof StatsSnapshot
  target: number
  /** format progress as currency */
  money?: boolean
}

export interface ChatMessage {
  id: string
  from: 'user' | 'coach'
  text: string
  date: string // ISO
}

export interface CoachConversation {
  id: string
  title: string
  date: string // ISO
  messages: ChatMessage[]
}

/** A canned coach reply, matched by keywords against the user's message. */
export interface CoachReply {
  id: string
  keywords: string[]
  /** per-path answers; falls back to `all` */
  text: Partial<Record<PathScope, string>>
  followUps: string[]
}

export interface WeeklyCheckin {
  id: string
  week: number
  date: string
  accomplished: string
  difficult: string
  prospects: number
  replies: number
  madeMoney: boolean
  improve: string
}

export interface FaqItem {
  q: string
  a: string
}

export interface Plan {
  id: 'monthly' | 'yearly'
  name: string
  price: string
  period: string
  note: string
  badge?: string
}
