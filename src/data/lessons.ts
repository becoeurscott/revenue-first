import { clippingLessons } from './lessons.clipping'
import { gbpLessons } from './lessons.gbp'
import { generalLessons } from './lessons.general'
import { mentorLessons } from './lessons.mentors'
import type { Lesson, LessonCategory, PathId } from './types'

export const lessons: Lesson[] = [...clippingLessons, ...gbpLessons, ...generalLessons, ...mentorLessons]

export const lessonCategories: LessonCategory[] = [
  'Mindset',
  'Getting Started',
  'Finding Clients',
  'Outreach',
  'Sales',
  'Pricing',
  'Delivery',
  'Retention',
  'Clipping',
  'Google Business',
  'Productivity',
  'Choosing Mentors',
]

export function getLesson(id: string | undefined): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}

/** Lessons visible for a path: its own curriculum plus the shared library. */
export function lessonsForPath(path: PathId): Lesson[] {
  return lessons.filter((l) => l.path === path || l.path === 'all')
}
