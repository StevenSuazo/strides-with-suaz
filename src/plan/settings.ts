/**
 * settings.ts: the fixed numbers of this training plan.
 *
 * One person, one plan, so these are constants. Week 1 starts on a Monday and
 * the race falls on the Sunday that ends week 19. startLongRunMiles is week
 * 1's long run, which the gate then builds on.
 */
import type { IsoDate, PlanSetup } from '../engine/types'

export type PlanSettings = {
  startDate: IsoDate
  raceDate: IsoDate
  totalWeeks: number
  startMiles: number
  peakMiles: number
  startLongRunMiles: number
}

/** Whole weeks from a Monday start to the Sunday race: 2026-11-09 to 2027-03-21 is 19. */
export const totalWeeksBetween = (start: IsoDate, race: IsoDate): number => {
  const day = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`) / 86_400_000
  return Math.round((day(race) - day(start) + 1) / 7)
}

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
