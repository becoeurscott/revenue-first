import { plans } from '@/data/missions'
import type { Lesson, PathId } from '@/data/types'

/** A curriculum lesson unlocks when its day's mission is completed. Library lessons are always open. */
export function lessonDay(lesson: Lesson, pathId: PathId): number | null {
  return plans[pathId].find((d) => d.lessonId === lesson.id)?.day ?? null
}

export function isLessonLocked(lesson: Lesson, pathId: PathId, completedDays: number[]): boolean {
  const day = lessonDay(lesson, pathId)
  return day !== null && !completedDays.includes(day)
}
