/**
 * dates.ts: date helpers, counted from the plan start.
 *
 * What it does: answers "which training week is this date in?" and "when does
 * week N start?" for a plan that begins Monday, Nov 9, 2026 and ends on race
 * day, Sunday, March 21, 2027.
 *
 * Decision to confirm: dates are ISO strings ('2026-11-09'), not Date
 * objects. Parse and format them in UTC so a daylight-saving change (the
 * clocks move on March 14, 2027, inside the plan) cannot shift a week.
 *
 * Functions
 * - weekIndexForDate(date, planStart): 1-based week number. Nov 9 to Nov 15
 *   is week 1. Decide what a date before the start or after week 19 returns
 *   (throw, or null) and write it in the test.
 * - weekStartDate(weekIndex, planStart): the Monday that week begins.
 *   Week 19 starts '2027-03-15'.
 * - daysUntilRace(date, raceDate): whole days left. From '2026-11-10' to
 *   '2027-03-21' is 131.
 *
 * Tests: dates.test.ts. Write them first.
 * Status: stubs, throw until implemented.
 */
import type { IsoDate } from './types'

export const weekIndexForDate: (
  date: IsoDate,
  planStart: IsoDate,
) => number = () => {
  throw new Error('weekIndexForDate: not implemented')
}

export const weekStartDate: (
  weekIndex: number,
  planStart: IsoDate,
) => IsoDate = () => {
  throw new Error('weekStartDate: not implemented')
}

export const daysUntilRace: (
  date: IsoDate,
  raceDate: IsoDate,
) => number = () => {
  throw new Error('daysUntilRace: not implemented')
}
