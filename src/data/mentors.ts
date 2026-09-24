import type { MentorFlag, MentorQuestion, MentorVerdict } from './types'

/** Mentor Check: how to tell a real mentor from a fake guru, in any field. ALL DATA IS FICTITIOUS. */

export const mentorRedFlags: MentorFlag[] = [
  { title: 'They sell the lifestyle, not the skill', detail: 'Rented cars, cash on tables and beach laptops prove nothing about what they can teach you.' },
  { title: 'Their only business is teaching business', detail: 'If the course about making money is how they make money, they have never done what they teach.' },
  { title: 'Guaranteed or fast income', detail: '"$10K in 30 days" is a marketing line, not a plan. Real outcomes come with ranges and effort.' },
  { title: 'Artificial urgency', detail: 'Countdown timers, "3 spots left" and "price doubles tonight" exist to stop you from thinking.' },
  { title: 'Price hidden behind a call', detail: 'A "free strategy call" that turns into a high-pressure pitch is a sales funnel, not mentoring.' },
  { title: 'Pushes you into debt', detail: 'Anyone who tells you to use a credit card or a loan to "invest in yourself" is protecting their revenue, not yours.' },
  { title: 'Criticism = "broke mindset"', detail: 'Real experts answer hard questions. Fake ones attack the person asking and delete the comment.' },
]

export const mentorGreenFlags: MentorFlag[] = [
  { title: 'Still does the work', detail: 'They practice the skill today and can show recent, specific examples.' },
  { title: 'Results you can verify', detail: 'Case studies with real names, links and numbers you can check yourself.' },
  { title: 'Generous free content', detail: 'You can apply what they share for free today, without buying anything.' },
  { title: 'Honest about who it is not for', detail: 'They talk about effort, failure rates and the people who should not buy.' },
  { title: 'Clear price and refund policy', detail: 'You can see what you pay, what you get and how to get your money back.' },
]

export const mentorQuestions: MentorQuestion[] = [
  {
    id: 'proof',
    question: 'How do they prove they are good at what they teach?',
    why: 'Proof should be about the skill and the clients, not about their bank account or lifestyle.',
    options: [
      { label: 'Case studies with real clients, names and links', risk: 0 },
      { label: 'Screenshots of their own income', risk: 1 },
      { label: 'Cars, watches, travel and lifestyle content', risk: 2 },
    ],
  },
  {
    id: 'practice',
    question: 'Do they still do the thing they teach?',
    why: 'Someone who only sells courses about the skill may be out of date, or may never have done it at all.',
    options: [
      { label: 'Yes, they practice it today', risk: 0 },
      { label: 'They used to, now they mostly teach', risk: 1 },
      { label: 'Their only business is selling courses about making money', risk: 2 },
    ],
  },
  {
    id: 'free',
    question: 'What do they share for free?',
    why: 'Good mentors give away real value. Pure teasers are ads, not teaching.',
    options: [
      { label: 'Detailed content I can apply today', risk: 0 },
      { label: 'Teasers that always end with "the rest is in my course"', risk: 1 },
      { label: 'Almost nothing — everything leads to a sales call', risk: 2 },
    ],
  },
  {
    id: 'promise',
    question: 'What do they promise?',
    why: 'Nobody can guarantee income. Big fast promises are the most common sign of a scam.',
    options: [
      { label: 'Realistic ranges and the effort it takes', risk: 0 },
      { label: 'Fast results "if you follow the system"', risk: 1 },
      { label: 'Guaranteed income or a specific amount in a few weeks', risk: 2 },
    ],
  },
  {
    id: 'pressure',
    question: 'How are they selling it?',
    why: 'Urgency and hidden prices are designed to make you decide before you think.',
    options: [
      { label: 'Price on the page and time to decide', risk: 0 },
      { label: 'Price only revealed on a call', risk: 1 },
      { label: 'Countdown timers, "only 3 spots left", pressure to decide now', risk: 2 },
    ],
  },
  {
    id: 'budget',
    question: 'How does the price compare to your budget?',
    why: 'Your first revenue should never start with debt. Free and cheap resources are enough to earn your first money.',
    options: [
      { label: 'Affordable — I can pay without stress', risk: 0 },
      { label: 'A stretch, I would have to cut other things', risk: 1 },
      { label: 'They suggest a loan or credit card to "invest in yourself"', risk: 2 },
    ],
  },
  {
    id: 'honesty',
    question: 'How do they talk about risk and failure?',
    why: 'Real mentors tell you who should not buy. "Anyone can do it" ignores how hard the work is.',
    options: [
      { label: 'Openly — they share failures and who it is not for', risk: 0 },
      { label: 'They rarely mention it', risk: 1 },
      { label: '"Anyone can do it, there is no risk"', risk: 2 },
    ],
  },
  {
    id: 'reviews',
    question: 'What do independent reviews say?',
    why: 'Testimonials on their own site are chosen by them. Search "[name] + refund", "+ scam" and "+ review" on Reddit and YouTube.',
    options: [
      { label: 'Independent reviews, mostly positive and specific', risk: 0 },
      { label: 'I only found testimonials on their own site', risk: 1 },
      { label: 'Complaints about refunds, deleted comments or lawsuits', risk: 2 },
    ],
  },
  {
    id: 'refund',
    question: 'What is the refund policy?',
    why: 'Confident sellers make refunds simple. Missing or impossible conditions mean your money is gone once you pay.',
    options: [
      { label: 'Clear, written and easy to use', risk: 0 },
      { label: 'Vague or hard to find', risk: 1 },
      { label: 'No refunds, or conditions nobody can meet', risk: 2 },
    ],
  },
  {
    id: 'questions',
    question: 'How do they react to questions or criticism?',
    why: 'Experts welcome hard questions. Attacking or blocking critics is how fake gurus protect their image.',
    options: [
      { label: 'They answer directly and clearly', risk: 0 },
      { label: 'They ignore them', risk: 1 },
      { label: 'They mock people, say "broke mindset" or delete comments', risk: 2 },
    ],
  },
]

export const mentorVerdicts: MentorVerdict[] = [
  {
    id: 'trust',
    maxScore: 25,
    title: 'Looks trustworthy',
    summary: 'Most signs are healthy. This person seems to teach a real skill honestly — still verify before you pay.',
    next: [
      'Apply their free content for one week first',
      'Ask one past student directly how it went for them',
      'Only buy if it solves the exact problem you have right now',
    ],
  },
  {
    id: 'caution',
    maxScore: 55,
    title: 'Proceed with caution',
    summary: 'Some warning signs. Do not pay yet — get answers to the flagged points first.',
    next: [
      'Search their name with "refund", "scam" and "review"',
      'Ask them in writing about each flagged point below',
      'Compare with free resources already in your library',
    ],
  },
  {
    id: 'avoid',
    maxScore: 100,
    title: 'High risk — walk away',
    summary: 'Too many red flags. This looks like a guru selling the dream, not a mentor teaching a skill.',
    next: [
      'Do not pay, and do not book their "free call"',
      'Unfollow them so the pressure stops',
      'Put that money and time into your 30-day plan instead',
    ],
  },
]

/** Risk score from 0 (all healthy) to 100 (all red flags). */
export function mentorScore(answers: number[]): number {
  const total = answers.reduce((sum, a, i) => sum + (mentorQuestions[i]?.options[a]?.risk ?? 0), 0)
  return Math.round((total / (mentorQuestions.length * 2)) * 100)
}

export function mentorVerdict(score: number): MentorVerdict {
  return mentorVerdicts.find((v) => score <= v.maxScore) ?? mentorVerdicts[mentorVerdicts.length - 1]
}
