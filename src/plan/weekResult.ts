/**
 * weekResult.ts: turns one week of logged runs and check-ins into a WeekResult.
 *
 * buildWeekResult({ weekIndex, targetMiles, runs, checkIns, planStart })
 * - actualMiles: every run dated in the week, matched or not, rounded to
 *   hundredths so float noise (0.1 + 0.2) disappears.
 * - longRunMiles: the longest single run that week, 0 with no runs.
 * - highestPain: the highest entry pain across the week's check-ins, 0 with
 *   none. A next-morning check-in counts toward the day before it, so
 *   Sunday's run reported on Monday belongs to the week just ended.
 * - Runs and check-ins outside the week, or before the plan, are ignored.
 * - A week below 1 or not a whole number throws a RangeError.
 */
import { weekIndexForDate, weekStartDate } from '../engine'
import type { CheckIn, IsoDate, Run, WeekResult } from '../engine/types'
import { previousDay } from './days'

type Input = {
  weekIndex: number
  targetMiles: number
  runs: Run[]
  checkIns: CheckIn[]
  planStart: IsoDate
}

const hundredths = (value: number): number => Math.round(value * 100) / 100

export const buildWeekResult: (input: Input) => WeekResult = ({
  weekIndex,
  targetMiles,
  runs,
  checkIns,
  planStart,
}) => {
  if (!Number.isInteger(weekIndex)) {
    throw new RangeError(
      `buildWeekResult: weekIndex must be a whole number, got ${weekIndex}`,
    )
  }
  weekStartDate(weekIndex, planStart)

  const inWeek = (date: IsoDate): boolean =>
    date >= planStart && weekIndexForDate(date, planStart) === weekIndex

  const weekRuns = runs.filter((run) => inWeek(run.date))
  const weekCheckIns = checkIns.filter((checkIn) =>
    inWeek(
      checkIn.kind === 'nextMorning' ? previousDay(checkIn.date) : checkIn.date,
    ),
  )

  return {
    weekIndex,
    targetMiles,
    actualMiles: hundredths(weekRuns.reduce((sum, run) => sum + run.miles, 0)),
    longRunMiles: Math.max(0, ...weekRuns.map((run) => run.miles)),
    highestPain: Math.max(
      0,
      ...weekCheckIns.flatMap((checkIn) =>
        checkIn.entries.map((entry) => entry.pain),
      ),
    ),
  }
}
