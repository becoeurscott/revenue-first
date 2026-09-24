import { clippingPlan } from './missions.clipping'
import { gbpPlan } from './missions.gbp'
import type { DayPlan, PathId } from './types'

export const TOTAL_DAYS = 30

export const plans: Record<PathId, DayPlan[]> = {
  clipping: clippingPlan,
  gbp: gbpPlan,
}

export function getDay(path: PathId, day: number): DayPlan | undefined {
  return plans[path].find((d) => d.day === day)
}
