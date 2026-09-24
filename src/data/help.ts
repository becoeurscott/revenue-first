import type { FaqItem } from './types'

export const faqs: FaqItem[] = [
  {
    q: 'How does my path get selected?',
    a: 'Your onboarding answers decide it. We look at your skills, the time and budget you have, and how comfortable you are talking to business owners. If you enjoy video and editing, we recommend Short-Form Clipping. If you prefer structured, checklist-style work with local businesses, we recommend Google Business Profiles. You always see the reasoning, and you can pick the other path if you disagree.',
  },
  {
    q: 'Can I change paths?',
    a: 'Yes. Go to Profile, then Paths, and choose the other path. Your progress, prospects and revenue on each path are saved separately, so you can switch back without losing anything. We suggest giving a path at least 7 days before switching, because most people get their first reply in week two.',
  },
  {
    q: 'How does the 30-day program work?',
    a: 'Each day unlocks one mission with 3 to 5 small tasks and a short lesson. Week 1 sets up your offer and prospect list, week 2 is outreach, week 3 is conversations and closing, and week 4 is delivery and repeat business. Most missions take 30 to 60 minutes. Complete a mission to earn XP and keep your streak alive.',
  },
  {
    q: 'How does the AI Coach work?',
    a: 'The Coach answers questions about finding clients, pricing, outreach and objections, using your path and your progress as context. Ask it in plain language, the way you would ask a mentor. In this prototype, the Coach uses a library of prepared answers rather than a live AI model, so very unusual questions get a general reply.',
  },
  {
    q: 'What happens after Day 30?',
    a: 'You keep everything: your prospects, templates, lessons and revenue tracker. You also unlock a "Next 30" plan focused on turning one-off clients into monthly retainers and raising your prices. You can also restart the program on the other path.',
  },
  {
    q: 'How do billing and cancellation work?',
    a: 'Premium is $19.99 per month or $149.99 per year. You can cancel any time from Profile, then Subscription. After you cancel, you keep access until the end of the period you already paid for. This prototype never charges a real card.',
  },
  {
    q: 'How do streaks work?',
    a: 'Your streak grows by one each day you complete at least one mission task. Miss a full calendar day and it resets to zero. Your longest streak is always kept on your Streak page, so a reset never erases your record.',
  },
  {
    q: 'Is my data real?',
    a: 'No. This prototype uses fictitious data stored only on your device. The prospects, clients, messages and payments you see are made-up examples, and anything you add stays in your browser. Nothing is sent to a server.',
  },
  {
    q: 'Do I need to spend money on tools?',
    a: 'No. Both paths are designed to start at $0. Clipping works with free editors such as CapCut, and Google Business Profile audits only need a browser and our checklist. Paid tools are optional, and we only suggest them after your first client has paid.',
  },
  {
    q: 'Does FirstRevenue guarantee I will make money?',
    a: 'No, and you should be careful with anyone who does. We give you a proven daily process, scripts and coaching. Your results depend on how many people you contact and how consistently you follow up. Most beginners need 30 to 50 outreach messages to land a first client.',
  },
]

export const helpTopics: { id: string; emoji: string; title: string; description: string }[] = [
  { id: 'getting-started', emoji: '🚀', title: 'Getting started', description: 'Onboarding, choosing a path and your first mission.' },
  { id: 'program', emoji: '🗓️', title: 'Program & missions', description: 'Daily missions, XP, streaks and weekly check-ins.' },
  { id: 'coach', emoji: '🤖', title: 'AI Coach', description: 'What to ask, how answers work and saved conversations.' },
  { id: 'prospects', emoji: '📇', title: 'Prospects & outreach', description: 'Tracking prospects, templates and follow-ups.' },
  { id: 'revenue', emoji: '💵', title: 'Revenue & pricing', description: 'Logging deals, the pricing calculator and goals.' },
  { id: 'billing', emoji: '💳', title: 'Account & billing', description: 'Plans, cancellation, your profile and your data.' },
]

export const problemCategories: string[] = [
  'Something is not working',
  'My progress or streak looks wrong',
  'Billing or subscription',
  'AI Coach gave a bad answer',
  'Lesson or resource issue',
  'Other',
]
