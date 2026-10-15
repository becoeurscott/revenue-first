/** Types derived from docs/api/vaulten-openapi.json (+ admin extensions). */
export type Role = "USER" | "SUPPORT" | "CONTENT_MANAGER" | "ADMIN" | "SUPER_ADMIN";
export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DELETED";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export const STAFF_ROLES: Role[] = ["SUPPORT", "CONTENT_MANAGER", "ADMIN", "SUPER_ADMIN"];
export const CONTENT_STATUSES: ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export interface AdminUser { id: string; email: string; firstName: string | null; lastName: string | null; timeZone: string; role: Role; accountStatus: AccountStatus; createdAt: string; updatedAt: string; adminNote?: string | null }
export interface PageMeta { page: number; pageSize: number; totalItems: number; totalPages: number }
export interface Paged<T> { data: T[]; meta: PageMeta }
export interface AuditLog { id: string; occurredAt: string; action: string; actorId: string | null; actorRole: Role | null; targetType: string | null; targetId: string | null; requestId: string | null; metadata: Record<string, unknown> }
export type SettingType = "string" | "number" | "boolean" | "number[]" | "object[]";
export interface Setting { key: string; description: string; type: SettingType; value: unknown; defaultValue: unknown; updatedAt: string | null }
export interface FeatureFlag { key: string; description: string; enabled: boolean; defaultEnabled: boolean; updatedAt: string | null }
export type Tool = "PROSPECTS" | "GBP_AUDITS" | "OUTREACH_TEMPLATES" | "DEALS";
export const TOOLS: Tool[] = ["PROSPECTS", "GBP_AUDITS", "OUTREACH_TEMPLATES", "DEALS"];
export interface AdminPath { id: string; slug: string; name: string; tagline: string; description: string; position: number; tools: Tool[]; status: ContentStatus; createdAt: string; updatedAt: string }
export interface PathWeek { id: string; number: number; title: string; objective: string; position: number; createdAt: string; updatedAt: string }
export interface AdminPathDetail extends AdminPath { weeks: PathWeek[] }
export interface AdminLesson { id: string; pathId: string; weekId: string; slug: string; title: string; summary: string; content: string; videoUrl: string | null; durationMinutes: number | null; xpReward: number; position: number; status: ContentStatus; createdAt: string; updatedAt: string; minWatchPercent?: number | null; instructor?: string | null; category?: string | null }
export type ResourceType = "GUIDE" | "TEMPLATE" | "CHECKLIST" | "VIDEO" | "LINK" | "TOOL";
export const RESOURCE_TYPES: ResourceType[] = ["GUIDE", "TEMPLATE", "CHECKLIST", "VIDEO", "LINK", "TOOL"];
export interface AdminResource { id: string; pathId: string; lessonId: string | null; type: ResourceType; title: string; slug: string; position: number; status: ContentStatus; createdAt: string; updatedAt: string; description?: string | null }
export interface ResourceSection { id: string; resourceId: string; title: string; body: string; position: number; createdAt: string; updatedAt: string }
export interface AdminResourceDetail extends AdminResource { sections: ResourceSection[] }
export type MissionTaskType = "ACTION" | "LESSON" | "RESOURCE" | "PROSPECTING" | "REFLECTION";
export const TASK_TYPES: MissionTaskType[] = ["ACTION", "LESSON", "RESOURCE", "PROSPECTING", "REFLECTION"];
export interface AdminMissionTask { id: string; dayId: string; title: string; description: string; type: MissionTaskType; linkedLessonId: string | null; linkedResourceId: string | null; xpReward: number; isRequired: boolean; position: number; status: ContentStatus; createdAt: string; updatedAt: string }
export interface AdminMissionDay { id: string; planId: string; dayNumber: number; title: string; objective: string; tasks: AdminMissionTask[]; createdAt: string; updatedAt: string }
export interface AdminMissionPlan { id: string; pathId: string; title: string; description: string; durationDays: number; status: ContentStatus; days: AdminMissionDay[]; createdAt: string; updatedAt: string }
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE" | "NUMBER" | "TEXT";
export const QUESTION_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SCALE", "NUMBER", "TEXT"];
export interface OptionWeight { pathId: string; points: number }
export interface AdminOption { id: string; questionId: string; label: string; value: string; position: number; weights: OptionWeight[] }
export interface AdminQuestion { id: string; categoryId: string; key: string; prompt: string; helpText: string | null; type: QuestionType; isRequired: boolean; minValue: number | null; maxValue: number | null; position: number; status: ContentStatus; options: AdminOption[]; createdAt: string; updatedAt: string }
export interface AdminCategory { id: string; title: string; description: string; position: number; status: ContentStatus; questions: AdminQuestion[]; createdAt: string; updatedAt: string }
export type RuleOperator = "EQUALS" | "NOT_EQUALS" | "INCLUDES" | "NOT_INCLUDES" | "GT" | "GTE" | "LT" | "LTE";
export type RuleEffect = "EXCLUDE_PATH" | "BLOCK_PATH" | "BOOST_PATH";
export const RULE_OPERATORS: RuleOperator[] = ["EQUALS", "NOT_EQUALS", "INCLUDES", "NOT_INCLUDES", "GT", "GTE", "LT", "LTE"];
export const RULE_EFFECTS: RuleEffect[] = ["BOOST_PATH", "EXCLUDE_PATH", "BLOCK_PATH"];
export interface AdminRule { id: string; questionKey: string; operator: RuleOperator; value: string; effect: RuleEffect; pathId: string; points: number; reason: string | null; priority: number; status: ContentStatus; createdAt: string; updatedAt: string }
export interface Contribution { source: "ANSWER" | "RULE"; questionKey: string; optionValue: string | null; optionLabel: string | null; ruleId: string | null; points: number }
export interface RankedPath { pathId: string; slug: string; name: string; score: number; contributions: Contribution[] }
export interface RemovedPath { pathId: string; slug: string; name: string; questionKey: string; reason: string | null }
export interface PreviewRecommendation { recommended: RankedPath | null; ranked: RankedPath[]; excluded: RemovedPath[]; blocked: RemovedPath[]; algorithmVersion: number }
export type ContactChannel = "EMAIL" | "PHONE" | "SMS" | "INSTAGRAM_DM" | "FACEBOOK_DM" | "TIKTOK_DM" | "LINKEDIN" | "IN_PERSON" | "OTHER";
export const CHANNELS: ContactChannel[] = ["EMAIL", "PHONE", "SMS", "INSTAGRAM_DM", "FACEBOOK_DM", "TIKTOK_DM", "LINKEDIN", "IN_PERSON", "OTHER"];
export interface AdminTemplate { id: string; pathId: string | null; channel: ContactChannel; title: string; body: string; position: number; status: ContentStatus; createdAt: string; updatedAt: string }
export interface AdminCriterion { id: string; label: string; description: string | null; points: number; position: number; status: ContentStatus; createdAt: string; updatedAt: string }
export interface Money { amountCents: number; currency: string }
export interface ProgressSummary { totalXp: number; level: number; levelStartXp: number; nextLevelXp: number | null; currentStreak: number; longestStreak: number; lastActiveOn: string | null; lessonsCompleted: number; mission: { userMissionPlanId: string; planId: string; status: string; currentDay: number; durationDays: number; daysCompleted: number; tasksCompleted: number } | null; checkedInThisWeek: boolean; prospectsContacted: number; prospectsReplied: number; revenue: Money; firstRevenueReached: boolean }
export interface AdminProspect { id: string; userId: string; businessName: string; contactName: string | null; email: string | null; phone: string | null; city: string | null; category: string | null; source: string; status: string; lastContactedAt: string | null; createdAt: string }
export interface AdminDeal { id: string; userId: string; clientName: string; title: string; expectedValue: Money | null; wonValue: Money | null; status: "OPEN" | "WON" | "LOST"; lostReason: string | null; createdAt: string }
export interface AdminPayment { id: string; userId: string; amount: Money; receivedOn: string; source: string; status: "RECORDED" | "VOIDED"; note: string | null; voidReason: string | null; createdAt: string }
export interface LessonProgressRow { lessonId: string; title: string; watchedPercent: number; status: "IN_PROGRESS" | "COMPLETED"; startedAt: string; completedAt: string | null }
export interface ContentDoc<T = unknown> { key: string; description: string; version: number; value: T; updatedAt: string; updatedBy: string }
export interface ContentVersion { version: number; updatedAt: string; updatedBy: string; note: string | null }
export interface Overview { days: number; sources: { users: string; engagement: string | null; posthogError: string | null }; totals: { users: number; newUsers: number; newUsersTrend: number | null; staff: number; activeUsers24h: number | null; activeUsers7d: number | null; sessions: number | null; events: number | null; lessonsCompleted: number | null; tasksCompleted: number | null; missionsCompleted: number | null; coachMessages: number | null; firstRevenueUsers: number | null }; byStatus: { label: string; value: number }[]; byPath: { label: string; value: number }[]; funnel: { label: string; value: number }[]; topLessons: { label: string; value: number }[]; series: { date: string; sessions: number; events: number; signups: number; lessonsCompleted: number; tasksCompleted: number; paymentsCents: number; firstRevenue: number; coachMessages: number; activeUsers: number }[]; recentSignups: AdminUser[] }
export interface AdminNotification { id: string; type: string; title: string; body: string; link: string | null; audience: "all" | "user"; userId: string | null; status: string; sentAt: string; recipients: number }
export interface Maintenance { enabled: boolean; message: string; until: string | null; updatedAt: string | null }
export type SupportStatus = "open" | "replied" | "closed";
export type SupportKind = "contact" | "problem";
export interface SupportReply { id: string; body: string; authorId: string; authorName: string; createdAt: string }
export interface SupportMessage { id: string; ticketNumber: number; kind: SupportKind; category: string | null; email: string; message: string; status: SupportStatus; appVersion: string | null; platform: string; device: string | null; osVersion: string | null; userId: string | null; createdAt: string; updatedAt: string; lastReplyAt: string | null }
export interface SupportUserSummary { id: string; name: string; email: string; plan: string | null; journey: string | null; accountStatus: AccountStatus; createdAt: string }
export interface SupportMessageDetail extends SupportMessage { replies: SupportReply[]; user: SupportUserSummary | null }
export interface SupportPage { data: SupportMessage[]; meta: PageMeta & { counts: Record<SupportStatus, number> } }
