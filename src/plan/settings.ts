/**
 * settings.ts: the fixed numbers of this training plan.
 *
 * The built-in plan, also the default when nothing is saved. Week 1 starts on
 * a Monday and the race falls in the last week (here a Sunday, the end of
 * week 19). startLongRunMiles is week
 * 1's long run, which the gate then builds on.
 */
import { weekIndexForDate } from '../engine/dates'
import type { IsoDate, PlanSetup } from '../engine/types'

export type PlanSettings = {
  startDate: IsoDate
  raceDate: IsoDate
  totalWeeks: number
  startMiles: number
  peakMiles: number
  startLongRunMiles: number
}

/**
 * The number of the week the race falls in, counting from a Monday start, so
 * the plan's length: 2026-11-09 to 2027-03-21 is 19, and so is a race on any
 * other day of that last week (Mar 15 to 21).
 */
export const totalWeeksBetween = (start: IsoDate, race: IsoDate): number =>
  weekIndexForDate(race, start)

/** A saved setup plus the week count worked out from its dates. */
export const planFromSetup = (setup: PlanSetup): PlanSettings => ({
  ...setup,
  totalWeeks: totalWeeksBetween(setup.startDate, setup.raceDate),
})

export const PLAN: PlanSettings = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  totalWeeks: 19,
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}
