import type { Lesson } from './types'

/** How to choose who to learn from. Shown on every path. ALL DATA IS FICTITIOUS. */
export const mentorLessons: Lesson[] = [
  {
    id: 'men-01',
    title: 'Fake Gurus: The 7 Red Flags',
    category: 'Choosing Mentors',
    path: 'all',
    duration: '10:12',
    minutes: 10,
    hue: 352,
    summary:
      'Most "make money online" content is sold by people whose only income is selling it. Learn the seven signs that someone is selling a dream instead of teaching a skill — in any field.',
    learn: [
      'Why lifestyle proof (cars, cash, travel) says nothing about the skill',
      'How urgency, hidden prices and "free calls" are built to rush your decision',
      'The debt trap: why nobody honest asks you to borrow to "invest in yourself"',
    ],
    takeaways: [
      'Count the red flags before you count the testimonials',
      'Never decide on a call — ask for the price and the refund policy in writing',
      'If they tell you to use a credit card, the answer is no',
    ],
    resourceIds: ['res-mentor-checklist'],
    instructor: 'Priya Nair',
  },
  {
    id: 'men-02',
    title: 'What a Real Mentor Looks Like',
    category: 'Choosing Mentors',
    path: 'all',
    duration: '8:05',
    minutes: 8,
    hue: 152,
    summary:
      'Good mentors exist in every field, and many of them teach for free. Here is how to recognise someone who still does the work, shows verifiable results and is honest about what it takes.',
    learn: [
      'Practitioners vs. course sellers: how to tell them apart in five minutes',
      'What verifiable proof looks like: names, links, numbers you can check',
      'Why the best teachers tell you who should not buy from them',
    ],
    takeaways: [
      'Follow people who still do the job today, not people who used to',
      'Apply someone\'s free content for a week before you pay them anything',
      'Pick one mentor per skill and ignore the rest for 30 days',
    ],
    resourceIds: ['res-mentor-checklist'],
    instructor: 'Maya Thompson',
  },
  {
    id: 'men-03',
    title: 'Before You Pay for Any Course: The 10-Minute Check',
    category: 'Choosing Mentors',
    path: 'all',
    duration: '7:40',
    minutes: 8,
    hue: 38,
    summary:
      'A simple routine to run before you spend a single dollar on a course, coaching program or "mastermind". Ten minutes of research can save you months of money and motivation.',
    learn: [
      'The three searches to run: name + "refund", + "scam", + "review"',
      'How to ask a past student for an honest opinion',
      'How to decide if you even need a paid course right now',
    ],
    takeaways: [
      'Run the Mentor Check in the app before every purchase',
      'Your first revenue does not require a paid course — your 30-day plan is enough',
      'Wait 48 hours before buying anything over $100',
    ],
    resourceIds: ['res-mentor-checklist'],
    instructor: 'Marcus Reed',
  },
]
