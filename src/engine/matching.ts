/**
 * matching.ts: links imported runs to planned workouts.
 *
 * matchRuns(plannedWorkouts, runs, overrides?, config?): MatchResult
 * - Overrides (run id to workout id) go first and win over every rule.
 * - Then same-date pairs, closest distance first, so two workouts on one day
 *   or two runs on one date go to the nearest fit.
 * - Then swapped days: a workout still unmatched takes an unmatched run one
 *   day either side if it is within config.swapMatchShare of the planned miles.
 * - Each run and each workout links at most once. Runs left over are
 *   unplannedRuns, workouts left over are missedWorkouts. Every list keeps the
 *   input order.
 * - Weekly miles for the gate come from all runs, matched or not, so this
 *   function never changes them.
 * - A bad date or negative miles throws a RangeError.
 */
import { DEFAULT_CONFIG } from './config'
import type { Config, MatchResult, Run, Workout } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

const dayNumber = (name: string, date: string): number => {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(
      `matchRuns: ${name} must be a real date like 2026-11-09, got ${date}`,
    )
  }
  return time / DAY_MS
}

const assertMiles = (name: string, miles: number): void => {
  if (!Number.isFinite(miles) || miles < 0) {
    throw new RangeError(
      `matchRuns: ${name} must be a finite number of miles, 0 or more, got ${miles}`,
    )
  }
}

export const matchRuns: (
  plannedWorkouts: Workout[],
  runs: Run[],
  overrides?: Record<string, string>,
  config?: Config,
) => MatchResult = (
  plannedWorkouts,
  runs,
  overrides = {},
  config = DEFAULT_CONFIG,
) => {
  plannedWorkouts.forEach((workout) =>
    assertMiles('workout miles', workout.miles),
  )
  runs.forEach((run) => assertMiles('run miles', run.miles))
  const workoutDay = plannedWorkouts.map((workout) =>
    dayNumber('workout date', workout.date),
  )
  const runDay = runs.map((run) => dayNumber('run date', run.date))

  const runForWorkout = new Map<number, number>()
  const takenRuns = new Set<number>()
  const link = (workout: number, run: number): void => {
    runForWorkout.set(workout, run)
    takenRuns.add(run)
  }

  for (const [runId, workoutId] of Object.entries(overrides)) {
    const run = runs.findIndex((candidate) => candidate.id === runId)
    const workout = plannedWorkouts.findIndex(
      (candidate) => candidate.id === workoutId,
    )
    if (
      run >= 0 &&
      workout >= 0 &&
      !takenRuns.has(run) &&
      !runForWorkout.has(workout)
    ) {
      link(workout, run)
    }
  }

  const pass = (
    daysApart: number,
    closeEnough: (planned: number, actual: number) => boolean,
  ): void => {
    const pairs: { workout: number; run: number; gap: number }[] = []
    plannedWorkouts.forEach((planned, workout) => {
      if (runForWorkout.has(workout)) return
      runs.forEach((actual, run) => {
        if (takenRuns.has(run)) return
        if (Math.abs(workoutDay[workout] - runDay[run]) !== daysApart) return
        if (!closeEnough(planned.miles, actual.miles)) return
        pairs.push({
          workout,
          run,
          gap: Math.abs(planned.miles - actual.miles),
        })
      })
    })
    pairs.sort(
      (a, b) => a.gap - b.gap || a.workout - b.workout || a.run - b.run,
    )
    for (const { workout, run } of pairs) {
      if (!runForWorkout.has(workout) && !takenRuns.has(run)) link(workout, run)
    }
  }

  pass(0, () => true)
  pass(
    1,
    (planned, actual) =>
      Math.abs(planned - actual) <= planned * config.swapMatchShare,
  )

  return {
    matched: plannedWorkouts.flatMap((workout, index) => {
      const run = runForWorkout.get(index)
      return run === undefined
        ? []
        : [{ workoutId: workout.id, runId: runs[run].id }]
    }),
    unplannedRuns: runs.filter((_, index) => !takenRuns.has(index)),
    missedWorkouts: plannedWorkouts.filter(
      (_, index) => !runForWorkout.has(index),
    ),
  }
}
