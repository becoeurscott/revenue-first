import type { OnboardingAnswers, OnboardingStep, PathId } from './types'

export const onboardingSteps: OnboardingStep[] = [
  {
    key: 'name',
    emoji: '👋',
    title: 'What should we call you?',
    subtitle: 'Your coach will use this to keep things personal.',
    kind: 'text',
    placeholder: 'Your first name',
    mascotLine: "Hi! I'm Penny. What's your name?",
  },
  {
    key: 'role',
    emoji: '🧭',
    title: 'What best describes you?',
    subtitle: 'This helps us fit the plan around your life.',
    kind: 'single',
    mascotLine: 'No wrong answers here.',
    options: [
      { value: 'Student', emoji: '🎓' },
      { value: 'Employee', emoji: '💼' },
      { value: 'Freelancer', emoji: '🧑‍💻' },
      { value: 'Creator', emoji: '🎥' },
      { value: 'Entrepreneur', emoji: '🚀' },
      { value: 'Job seeker', emoji: '🔎' },
      { value: 'Other', emoji: '✨' },
    ],
  },
  {
    key: 'skills',
    emoji: '🛠️',
    title: 'What skills do you already have?',
    subtitle: 'Pick everything that applies. "None yet" is a fine answer.',
    kind: 'multi',
    mascotLine: 'Ooh, tell me everything.',
    options: [
      { value: 'Video editing', emoji: '🎬' },
      { value: 'Writing', emoji: '✍️' },
      { value: 'Graphic design', emoji: '🎨' },
      { value: 'Social media', emoji: '📱' },
      { value: 'Sales', emoji: '🤝' },
      { value: 'Marketing', emoji: '📣' },
      { value: 'Customer service', emoji: '🎧' },
      { value: 'Photography', emoji: '📷' },
      { value: 'Research', emoji: '🔬' },
      { value: 'Web development', emoji: '💻' },
      { value: 'None yet', emoji: '🌱' },
      { value: 'Other', emoji: '✨' },
    ],
  },
  {
    key: 'experience',
    emoji: '📈',
    title: 'How much experience do you have?',
    subtitle: 'With earning money online, specifically.',
    kind: 'single',
    mascotLine: 'Everyone starts at zero.',
    options: [
      { value: 'None', emoji: '🌱', hint: "I've never earned money online" },
      { value: 'Beginner', emoji: '🐣', hint: "I've tried a few things" },
      { value: 'Some experience', emoji: '🧗', hint: "I've had a client or a sale" },
      { value: 'Experienced', emoji: '🏔️', hint: 'I earn online regularly' },
    ],
  },
  {
    key: 'time',
    emoji: '⏱️',
    title: 'How much time can you commit each day?',
    subtitle: "We'll size your daily missions to fit.",
    kind: 'single',
    mascotLine: 'Small and daily beats big and rare.',
    options: [
      { value: '15 minutes', emoji: '⚡' },
      { value: '30 minutes', emoji: '☕' },
      { value: '1 hour', emoji: '🎯' },
      { value: '2 hours', emoji: '🔥' },
      { value: '3+ hours', emoji: '🚀' },
    ],
  },
  {
    key: 'budget',
    emoji: '💵',
    title: "What's your starting budget?",
    subtitle: 'Both paths can be started for free.',
    kind: 'single',
    mascotLine: '$0 works. Promise.',
    options: [
      { value: '$0', emoji: '🪙' },
      { value: '$25', emoji: '💵' },
      { value: '$50', emoji: '💰' },
      { value: '$100', emoji: '💳' },
      { value: '$250+', emoji: '🏦' },
    ],
  },
  {
    key: 'comfort',
    emoji: '💬',
    title: 'How comfortable are you talking to potential clients?',
    subtitle: "Be honest — we'll build your confidence step by step.",
    kind: 'single',
    mascotLine: "I'll write the scary messages with you.",
    options: [
      { value: 'Very uncomfortable', emoji: '😰' },
      { value: 'A little uncomfortable', emoji: '😬' },
      { value: 'Neutral', emoji: '😐' },
      { value: 'Comfortable', emoji: '🙂' },
      { value: 'Very comfortable', emoji: '😎' },
    ],
  },
  {
    key: 'interest',
    emoji: '✨',
    title: 'What sounds more interesting?',
    subtitle: 'Go with your gut.',
    kind: 'single',
    mascotLine: 'This one matters most.',
    options: [
      { value: 'Creating content', emoji: '🎬', hint: 'Editing, clips, social media, creators' },
      { value: 'Helping businesses', emoji: '🏪', hint: 'Local shops, Google, reviews, visibility' },
    ],
  },
  {
    key: 'goal',
    emoji: '🎯',
    title: 'What is your first income goal?',
    subtitle: 'The first dollar is the hardest. Pick a target for 30 days.',
    kind: 'single',
    mascotLine: 'Ambitious. I like it.',
    options: [
      { value: '$50', emoji: '🥉' },
      { value: '$100', emoji: '🥈' },
      { value: '$250', emoji: '🥇' },
      { value: '$500', emoji: '🏆' },
      { value: '$1,000+', emoji: '💎' },
    ],
  },
  {
    key: 'blocker',
    emoji: '🧱',
    title: 'What is stopping you right now?',
    subtitle: "Pick the biggest one. Your plan will attack it first.",
    kind: 'single',
    mascotLine: "We'll knock that wall down.",
    options: [
      { value: "I don't know what to do", emoji: '🤷' },
      { value: "I don't know what to sell", emoji: '📦' },
      { value: "I don't know how to find clients", emoji: '🔭' },
      { value: "I'm afraid of rejection", emoji: '🫣' },
      { value: 'I lack experience', emoji: '🌱' },
      { value: 'I struggle with consistency', emoji: '📅' },
      { value: 'I need a step-by-step plan', emoji: '🗺️' },
    ],
  },
  {
    key: 'learning',
    emoji: '📚',
    title: 'How do you prefer to learn?',
    subtitle: "We'll lean your daily plan that way.",
    kind: 'single',
    mascotLine: 'Less theory. More action.',
    options: [
      { value: 'Watch videos', emoji: '▶️' },
      { value: 'Read guides', emoji: '📖' },
      { value: 'Do practical tasks', emoji: '🛠️' },
      { value: 'A combination', emoji: '🎛️' },
    ],
  },
  {
    key: 'commitment',
    emoji: '🔥',
    title: 'How serious are you about getting your first client?',
    subtitle: 'Last one. Then we build your plan.',
    kind: 'single',
    mascotLine: 'Almost there!',
    options: [
      { value: 'Just exploring', emoji: '👀' },
      { value: "I'm interested", emoji: '🙂' },
      { value: "I'm committed", emoji: '💪' },
      { value: "I'm ready to start today", emoji: '🚀' },
    ],
  },
]

export interface Recommendation {
  pathId: PathId
  /** 0–100 match score for the chosen path */
  match: number
  summary: string
  reasons: string[]
}

const CONTENT_SKILLS = ['Video editing', 'Social media', 'Graphic design', 'Photography', 'Writing']
const BUSINESS_SKILLS = ['Sales', 'Marketing', 'Customer service', 'Research', 'Web development']

/**
 * Frontend-only mock personalization engine.
 * Scores both paths from the onboarding answers and explains the winner.
 * Swap this for a real API call later — the return shape can stay the same.
 */
export function recommendPath(a: OnboardingAnswers): Recommendation {
  let clip = 0
  let gbp = 0
  const clipWhy: string[] = []
  const gbpWhy: string[] = []

  if (a.interest === 'Creating content') {
    clip += 4
    clipWhy.push("You're more excited by creating content than by consulting")
  } else if (a.interest === 'Helping businesses') {
    gbp += 4
    gbpWhy.push("You're drawn to helping real businesses get found")
  }

  const contentSkills = a.skills.filter((s) => CONTENT_SKILLS.includes(s))
  const businessSkills = a.skills.filter((s) => BUSINESS_SKILLS.includes(s))
  if (contentSkills.length) {
    clip += contentSkills.length * 1.5 + (contentSkills.includes('Video editing') ? 2 : 0)
    clipWhy.push(`You already have ${contentSkills.slice(0, 2).join(' and ').toLowerCase()} skills`)
  }
  if (businessSkills.length) {
    gbp += businessSkills.length * 1.5 + (businessSkills.includes('Sales') ? 2 : 0)
    gbpWhy.push(`Your ${businessSkills.slice(0, 2).join(' and ').toLowerCase()} background transfers directly`)
  }

  if (['Comfortable', 'Very comfortable'].includes(a.comfort)) {
    gbp += 1.5
    gbpWhy.push("You're comfortable talking to owners, which local outreach rewards")
  } else if (a.comfort) {
    clip += 1
    clipWhy.push('Creator outreach happens over DMs — low pressure while you build confidence')
  }

  if (['15 minutes', '30 minutes'].includes(a.time)) {
    gbp += 1
    gbpWhy.push(`Profile audits fit neatly into ${a.time} a day`)
  } else if (a.time) {
    clip += 1
    clipWhy.push(`${a.time} a day is enough to edit and pitch consistently`)
  }

  if (a.budget === '$0') {
    gbp += 0.5
    gbpWhy.push('It needs no paid tools to start')
  } else if (a.budget) {
    clipWhy.push(`Your ${a.budget} budget comfortably covers the editing tools`)
  }

  if (['Creator', 'Student'].includes(a.role)) clip += 0.5
  if (['Employee', 'Entrepreneur'].includes(a.role)) gbp += 0.5

  const pathId: PathId = gbp > clip ? 'gbp' : 'clipping'
  const total = clip + gbp || 1
  const winner = Math.max(clip, gbp)
  const match = Math.min(98, Math.round(72 + (winner / total) * 26))
  const reasons = (pathId === 'clipping' ? clipWhy : gbpWhy).slice(0, 4)
  if (a.goal) reasons.push(`A first ${a.goal} is realistic on this path within 30 days`)

  const summary =
    pathId === 'clipping'
      ? "Based on your skills, available time, and interest in content, we've matched you with Short-Form Clipping."
      : "Based on your strengths, schedule, and interest in helping businesses, we've matched you with Google Business Profiles."

  return { pathId, match, summary, reasons }
}

export const analysisSteps = [
  'Reading your answers',
  'Matching skills to paths',
  'Sizing missions to your schedule',
  'Building your 30-day plan',
]
