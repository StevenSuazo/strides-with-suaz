/**
 * projection.ts: the planned runs of a week that has not started.
 *
 * projectedRows(target, weekStart, settings?) lays the target out on a fully open week
 * (nothing saved yet, since availability is only set for the week in
 * progress) and returns the same rows the week strip draws, all "upcoming".
 * Used for the projected next week in the calendar. In race week, nothing is
 * planned on or after race day (see raceWeekAvailability).
 */
import { placeRuns } from '../engine'
import type { IsoDate, WeekAvailability, WeekTarget } from '../engine/types'
import { raceWeekAvailability } from './raceWeek'
import { PLAN, type PlanSettings } from './settings'
import { dateOfDay, workoutId, type PlannedRow } from './weekMatch'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

export const projectedRows = (
  target: WeekTarget,
  weekStart: IsoDate,
  settings: PlanSettings = PLAN,
): PlannedRow[] =>
  placeRuns(
    target,
    raceWeekAvailability(ALL_OPEN, target.weekIndex, settings),
  ).runs.map((planned): PlannedRow => ({
    workout: {
      id: workoutId(target.weekIndex, planned.dayIndex),
      date: dateOfDay(weekStart, planned.dayIndex),
      miles: planned.miles,
      kind: planned.kind,
    },
    dayIndex: planned.dayIndex,
    status: 'upcoming',
  }))
