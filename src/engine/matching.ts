/**
 * matching.ts: links imported runs to planned workouts.
 *
 * What it does: connects what I ran to what the plan said to run, for the
 * planned vs. actual display and the missed-workout labels.
 *
 * matchRuns(plannedWorkouts, runs, overrides?): MatchResult
 * - Same date, nearest distance: a run links to the workout on its date. If
 *   two workouts are planned that day, it links to the one closest in
 *   distance.
 * - Swapped days: if a planned workout has no run on its date, look one day
 *   either side for an unmatched run of similar distance.
 * - Unplanned runs (nothing planned that day) are kept, count toward weekly
 *   miles, and are not linked to a workout.
 * - Skipped workouts stay unmatched and show as missed.
 * - Manual override: overrides maps a run id to a workout id and wins over
 *   every rule above (the app remembers my choice). The optional parameter is
 *   a suggestion: change it as you build.
 * - One run links to at most one workout, and one workout to at most one run.
 * - Weekly actual miles for the gate come from ALL runs, matched or not, so
 *   a wrong match never skews volume. This function does not change them.
 *
 * Build this last, with the scheduler: it depends on the Strava import.
 *
 * Tests: matching.test.ts. Write them first.
 * Status: stub, throws until implemented.
 */
import type { MatchResult, Run, Workout } from './types'

export const matchRuns: (
  plannedWorkouts: Workout[],
  runs: Run[],
  overrides?: Record<string, string>,
) => MatchResult = () => {
  throw new Error('matchRuns: not implemented')
}
