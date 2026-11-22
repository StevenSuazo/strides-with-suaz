/**
 * projection.ts: the planned runs of a week that has not started.
 *
 * projectedRows(target, weekStart) lays the target out on a fully open week
 * (nothing saved yet, since availability is only set for the week in
 * progress) and returns the same rows the week strip draws, all "upcoming".
 * Used for the projected next week in the calendar.
 */
import { placeRuns } from '../engine'
import type { IsoDate, WeekAvailability, WeekTarget } from '../engine/types'
import { dateOfDay, workoutId, type PlannedRow } from './weekMatch'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

export const projectedRows = (
  target: WeekTarget,
  weekStart: IsoDate,
): PlannedRow[] =>
  placeRuns(target, ALL_OPEN).runs.map((planned): PlannedRow => ({
    workout: {
      id: workoutId(target.weekIndex, planned.dayIndex),
      date: dateOfDay(weekStart, planned.dayIndex),
      miles: planned.miles,
      kind: planned.kind,
    },
    dayIndex: planned.dayIndex,
    status: 'upcoming',
  }))
