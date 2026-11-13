/**
 * types.ts: shared shapes for the whole engine.
 *
 * What it does: defines every type the engine functions pass around, so no
 * other file invents its own version of "a week" or "a run".
 *
 * Conventions (change them here, before writing code, if you disagree):
 * - weekIndex is 1-based. Week 1 starts Monday, Nov 9, 2026. Week 19 ends on
 *   race day, Sunday, March 21, 2027.
 * - Distances are miles.
 * - Dates are ISO strings like '2026-11-09' with no time zone, so date math
 *   cannot drift by a day around midnight or a daylight-saving change.
 * - Day arrays run Monday (index 0) to Sunday (index 6).
 * - Pain is a whole number from 0 to 10. The gate reads the highest one in
 *   the week.
 *
 * Sources: docs/specs/weekly-progression.md (section 4) and the blueprint's
 * Code structure section. Types the spec does not list (availability,
 * scheduling, matching, check-ins) are suggestions: adjust as you build.
 */

export type IsoDate = string // 'YYYY-MM-DD'

// ---- Weekly progression -------------------------------------------------

export type WeekKind = 'build' | 'recovery' | 'peak' | 'taper' | 'race'

export type Decision =
  'advance' | 'repeat' | 'stepBack' | 'recovery' | 'taper' | 'race'

export type WeekTarget = {
  weekIndex: number
  targetMiles: number
  longRunMiles: number
}

/** What actually happened in a finished week. */
export type WeekResult = {
  weekIndex: number
  targetMiles: number
  actualMiles: number // all runs that week, matched to a workout or not
  longRunMiles: number // longest run actually done
  highestPain: number // highest check-in number that week, 0 to 10
}

/** Memory the gate carries from week to week. Adjust as you build. */
export type GateState = {
  reducedMode: boolean // true while progression is +5% instead of +10%
  goodWeeksInRow: number // weeks at or above the advance threshold
  lastLongRunMiles: number // last non-recovery long run
  weekBeforeRecovery?: WeekResult // where to resume after a recovery week
}

export type GateResult = {
  next: WeekTarget
  decision: Decision
  reducedMode: boolean
  reason: string // plain English, shown in the UI
}

export type GoalCheck = {
  onTrack: boolean
  gapMiles: number // curve's peak minus the peak the capped path can reach
  reachablePeakMiles: number
}

export type Config = {
  advanceThreshold: number // ratio of actual to target needed to advance
  repeatThreshold: number // ratio at or above this repeats the week
  normalStep: number // weekly increase cap, as a fraction
  reducedStep: number // weekly increase cap while in reduced mode
  minStepMiles: number // smallest increase worth making, normal mode
  minStepMilesReduced: number // same, in reduced mode
  goodWeeksToLeaveReducedMode: number
  painThreshold: number // above this number counts as a step-back week
  painStepBackFactor: number // next target as a fraction of this week's target
  recoveryEvery: number // every Nth week is a recovery week
  recoveryFactor: number // recovery week as a fraction of the last up week
  taperFactor: number // taper week as a fraction of peak
  raceWeekMiles: number
  defaultPeakMiles: number
  longRunMaxShare: number // long run as a fraction of the week's miles
  longRunStepMiles: number
  easyRunMaxShare: number // no easy run over this share of the week
  minRunsPerWeek: number
  goalOnTrackShare: number // reachable peak needed, as a share of the goal peak
}

// ---- Scheduling ---------------------------------------------------------

export type DayAvailability = 'open' | 'morning' | 'off'
export type WeekAvailability = DayAvailability[] // length 7, Monday first

export type RunKind = 'easy' | 'long'

export type PlannedRun = {
  dayIndex: number // 0 = Monday ... 6 = Sunday
  kind: RunKind
  miles: number
}

export type ScheduleResult = {
  runs: PlannedRun[]
  shortByMiles: number // target miles the cap would not allow
  notes: string[] // plain English, shown in the UI when a rule bends
}

// ---- Matching -----------------------------------------------------------

export type Workout = {
  id: string
  date: IsoDate
  miles: number
  kind: RunKind
}

export type Run = {
  id: string
  date: IsoDate
  miles: number
  source: 'strava' | 'in_app'
}

export type MatchResult = {
  matched: { workoutId: string; runId: string }[]
  unplannedRuns: Run[]
  missedWorkouts: Workout[]
}

// ---- Check-ins ----------------------------------------------------------

export type BodyArea =
  | 'knee'
  | 'shin'
  | 'calf'
  | 'achilles'
  | 'foot'
  | 'ankle'
  | 'hip'
  | 'hamstring'
  | 'quad'
  | 'back'
  | 'other'

export type Side = 'left' | 'right' | 'na'

export type CheckInEntry = {
  area: BodyArea
  side: Side
  pain: number // 0 to 10
  otherLabel?: string // typed when area is 'other'
}

export type CheckIn = {
  id: string
  date: IsoDate
  workoutId?: string
  activityId?: string
  feel: 'good' | 'okay' | 'rough'
  entries: CheckInEntry[]
  note?: string
  kind: 'afterRun' | 'nextMorning'
}
