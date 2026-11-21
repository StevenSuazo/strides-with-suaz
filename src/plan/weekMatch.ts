/**
 * weekMatch.ts: lines this week's planned runs up against the runs you logged.
 *
 * matchWeek(...) turns each planned run into a workout (id like "w2-0": week 2,
 * Monday), runs the matching engine over this week's logged runs, and says for
 * each planned run whether it is done, missed (its day has passed) or
 * upcoming (today or later). Logged runs that matched nothing come back as
 * extraRuns. Only runs dated inside the week are looked at.
 *
 * overrideWrites(...) says which overrides to save when you pick a run for a
 * workout by hand. If another run was already hand-matched to that workout, it
 * is set to UNMATCHED (an id no workout has), so it no longer fights for it.
 *
 * overrideClears(...) says which overrides to delete when you let the app
 * decide again for a run: that run's, plus any run in the same week that was
 * freed by a takeover (UNMATCHED), so the app's own matching comes back.
 */
import { matchRuns } from '../engine'
import type { IsoDate, PlannedRun, Run, Workout } from '../engine/types'

export const UNMATCHED = 'unmatched'

export type PlannedRow = {
  workout: Workout
  dayIndex: number
  status: 'done' | 'missed' | 'upcoming'
  run?: Run
}

export type WeekMatch = {
  rows: PlannedRow[]
  extraRuns: Run[]
  weekRuns: Run[]
}

export const dateOfDay = (weekStart: IsoDate, dayIndex: number): IsoDate => {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + dayIndex))
    .toISOString()
    .slice(0, 10)
}

export const workoutId = (weekIndex: number, dayIndex: number): string =>
  `w${weekIndex}-${dayIndex}`

export const matchWeek = ({
  weekIndex,
  weekStart,
  planned,
  runs,
  overrides,
  today,
}: {
  weekIndex: number
  weekStart: IsoDate
  planned: PlannedRun[]
  runs: Run[]
  overrides: Record<string, string>
  today: IsoDate
}): WeekMatch => {
  const weekEnd = dateOfDay(weekStart, 6)
  const weekRuns = runs
    .filter((run) => run.date >= weekStart && run.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  const workouts: Workout[] = planned.map((p) => ({
    id: workoutId(weekIndex, p.dayIndex),
    date: dateOfDay(weekStart, p.dayIndex),
    miles: p.miles,
    kind: p.kind,
  }))

  const result = matchRuns(workouts, weekRuns, overrides)

  const rows = planned.map((p, index): PlannedRow => {
    const workout = workouts[index]
    const link = result.matched.find((m) => m.workoutId === workout.id)
    const run = link && weekRuns.find((r) => r.id === link.runId)
    if (run) return { workout, dayIndex: p.dayIndex, status: 'done', run }
    return {
      workout,
      dayIndex: p.dayIndex,
      status: workout.date < today ? 'missed' : 'upcoming',
    }
  })

  return { rows, extraRuns: result.unplannedRuns, weekRuns }
}

export const overrideWrites = (
  overrides: Record<string, string>,
  workout: string,
  runId: string,
): [string, string][] => [
  ...Object.entries(overrides)
    .filter(([otherRun, target]) => target === workout && otherRun !== runId)
    .map(([otherRun]): [string, string] => [otherRun, UNMATCHED]),
  [runId, workout],
]

export const overrideClears = (
  overrides: Record<string, string>,
  weekRuns: Run[],
  runId: string,
): string[] => {
  const freed = weekRuns
    .map((run) => run.id)
    .filter((id) => id !== runId && overrides[id] === UNMATCHED)
  return [runId, ...freed].filter((id) => id in overrides)
}
