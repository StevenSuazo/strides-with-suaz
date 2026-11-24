/**
 * raceWeek.ts: no runs on or after race day.
 *
 * raceWeekAvailability(availability, weekIndex, settings): in the last week of
 * the plan, race day and every day after it become 'off', so runs are placed
 * only on the days before the race. Any other week comes back unchanged. A
 * Monday race leaves the whole week off. Returns a new array.
 */
import type { WeekAvailability } from '../engine/types'
import type { PlanSettings } from './settings'

export const raceWeekAvailability = (
  availability: WeekAvailability,
  weekIndex: number,
  settings: PlanSettings,
): WeekAvailability => {
  if (weekIndex !== settings.totalWeeks) return availability
  // Monday is day 0 ... Sunday is day 6; getUTCDay has Sunday as 0.
  const raceDay =
    (new Date(`${settings.raceDate}T00:00:00Z`).getUTCDay() + 6) % 7
  return availability.map((day, index) => (index >= raceDay ? 'off' : day))
}
