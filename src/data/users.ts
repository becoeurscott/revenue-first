import { daysAgo } from '@/lib/date'
import type { OnboardingAnswers, UserProfile } from './types'

/** The fictitious demo user used throughout the prototype. */
export const mockUser: UserProfile = {
  name: 'Alex Carter',
  email: 'alex.carter@firstrevenue.demo',
  age: 24,
  role: 'Student',
  skills: ['Video editing', 'Social media'],
  experience: 'Beginner',
  budget: '$50',
  time: '1 hour',
  goal: '$500',
  goalAmount: 500,
  confidence: 'Neutral',
  joined: daysAgo(6, 8),
}

export const mockAnswers: OnboardingAnswers = {
  name: 'Alex',
  role: 'Student',
  skills: ['Video editing', 'Social media'],
  experience: 'Beginner',
  time: '1 hour',
  budget: '$50',
  comfort: 'Neutral',
  interest: 'Creating content',
  goal: '$500',
  blocker: "I don't know how to find clients",
  learning: 'A combination',
  commitment: "I'm committed",
}

export const emptyAnswers: OnboardingAnswers = {
  name: '',
  role: '',
  skills: [],
  experience: '',
  time: '',
  budget: '',
  comfort: '',
  interest: '',
  goal: '',
  blocker: '',
  learning: '',
  commitment: '',
}
