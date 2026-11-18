/**
 * settings.ts: the fixed numbers of this training plan.
 *
 * One person, one plan, so these are constants. Week 1 starts on a Monday and
 * the race falls on the Sunday that ends week 19. startLongRunMiles is week
 * 1's long run, which the gate then builds on.
 */
import type { IsoDate } from '../engine/types'

export type PlanSettings = {
  startDate: IsoDate
  raceDate: IsoDate
  totalWeeks: number
  startMiles: number
  peakMiles: number
  startLongRunMiles: number
}

export const PLAN: PlanSettings = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  totalWeeks: 19,
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}
