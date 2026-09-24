import type { Plan } from './types'

/** Premium plans. ALL DATA IS FICTITIOUS — no real billing happens in this prototype. */
export const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$19.99',
    period: '/month',
    note: 'Billed monthly. Cancel anytime.',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$149.99',
    period: '/year',
    note: 'Just $12.50/month, billed annually.',
    badge: 'Save 37%',
  },
]

export const premiumBenefits: { emoji: string; title: string; description: string }[] = [
  {
    emoji: '🗓️',
    title: '30-day programs',
    description: 'A complete day-by-day program for each path, from your first prospect to your first payment.',
  },
  {
    emoji: '🤖',
    title: 'AI Coach',
    description: 'Ask anything, any time: pricing, outreach, objections, or what to do next.',
  },
  {
    emoji: '✅',
    title: 'Daily action plans',
    description: 'One focused mission a day with clear tasks you can finish in under an hour.',
  },
  {
    emoji: '🎓',
    title: 'Lesson library',
    description: 'Short, practical lessons on finding clients, selling, pricing and delivering.',
  },
  {
    emoji: '🧰',
    title: 'Resources',
    description: 'Outreach scripts, checklists, templates and calculators you can copy and use today.',
  },
  {
    emoji: '📈',
    title: 'Progress tracking',
    description: 'Track prospects, replies, clients, revenue and your streak in one place.',
  },
  {
    emoji: '🔀',
    title: 'Path switching',
    description: 'Try the other path whenever you like. Your progress on each one is saved.',
  },
]
