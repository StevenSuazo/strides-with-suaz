/**
 * config.ts: default settings, all in one place so they are easy to tune.
 *
 * Why it exists: the gate, the curve, and the scheduler should not have magic
 * numbers inside them. Every function takes an optional Config and falls back
 * to DEFAULT_CONFIG, so tests can pass their own values.
 *
 * Values come from docs/specs/weekly-progression.md (section 3).
 * painThreshold is a placeholder I set myself: a number above 3, or any pain
 * that changes how I run, counts as a step-back week. Change it any time.
 */
import type { Config } from './types'

export const DEFAULT_CONFIG: Config = {
  advanceThreshold: 0.9,
  repeatThreshold: 0.8,
  normalStep: 0.1,
  reducedStep: 0.05,
  minStepMiles: 0.5,
  minStepMilesReduced: 0.25,
  goodWeeksToLeaveReducedMode: 2,
  painThreshold: 3,
  painStepBackFactor: 0.7,
  recoveryEvery: 4,
  recoveryFactor: 0.75,
  taperFactor: 0.7,
  raceWeekMiles: 8,
  defaultPeakMiles: 22,
  longRunMaxShare: 0.5,
  longRunStepMiles: 1,
  easyRunMaxShare: 0.4,
  minRunsPerWeek: 3,
  goalOnTrackShare: 0.9,
}
