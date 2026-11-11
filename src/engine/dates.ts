/**
 * Decisions: dates are ISO strings ('2026-11-09'), not Date objects. All
 * math is in UTC so a daylight-saving change (the clocks move on March 14,
 * 2027, inside the plan) cannot shift a week.
 *
 * Functions
 * - weekIndexForDate(date, planStart): 1-based week number. Nov 9 to Nov 15
 *   is week 1. Throws a RangeError for a date before the start. It does not
 *   know the plan length, so checking for "after week 19" is the caller's job.
 * - weekStartDate(weekIndex, planStart): the Monday that week begins.
 *   Week 19 starts '2027-03-15'.
 * - daysUntilRace(date, raceDate): whole days left. From '2026-11-10' to
 *   '2027-03-21' is 131.
 *
 * Tests: dates.test.ts.
 * Status: done.
 */
import type { IsoDate } from './types'

const MS_PER_DAY = 86_400_000

const toDayNumber = (date: IsoDate): number => {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

export const weekIndexForDate: (date: IsoDate, planStart: IsoDate) => number = (
  date,
  planStart,
) => {
  const daysSinceStart = toDayNumber(date) - toDayNumber(planStart)
  if (daysSinceStart < 0) {
    throw new RangeError(
      `weekIndexForDate: ${date} is before the plan start ${planStart}`,
    )
  }
  return Math.floor(daysSinceStart / 7) + 1
}

export const weekStartDate: (
  weekIndex: number,
  planStart: IsoDate,
) => IsoDate = (weekIndex, planStart) => {
  const dayNumber = toDayNumber(planStart) + (weekIndex - 1) * 7
  if (weekIndex < 1) {
    throw new RangeError(
      `weekStartDate: ${weekIndex} is before the plan start ${planStart}`,
    )
  }
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10)
}

export const daysUntilRace: (date: IsoDate, raceDate: IsoDate) => number = (
  date,
  raceDate,
) => {
  return toDayNumber(raceDate) - toDayNumber(date)
}
