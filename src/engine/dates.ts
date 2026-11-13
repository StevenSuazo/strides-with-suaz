/**
 * dates.ts: date helpers, counted from the plan start.
 *
 * Dates are ISO strings ('2026-11-09'), and all math is in UTC so a
 * daylight-saving change (March 14, 2027, inside the plan) cannot shift a week.
 *
 * - weekIndexForDate(date, planStart): 1-based week number. Throws a
 *   RangeError before the start. Checking "after the last week" is the
 *   caller's job.
 * - weekStartDate(weekIndex, planStart): the Monday that week begins. Throws a
 *   RangeError below week 1.
 * - daysUntilRace(date, raceDate): whole days left.
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
