/**
 * targetCurve.ts: builds the planned weekly miles for every week.
 *
 * What it does: from my starting miles to race day, returns one target per
 * week, with recovery weeks, the peak, the taper, and race week built in. It
 * is built once and rebuilt only when the plan changes.
 *
 * buildTargetCurve(startMiles, peakMiles, totalWeeks, config?): number[]
 * - Index 0 is week 1. Use getWeekKind to know each week's role.
 * - Weeks climb in 4-week cycles: three up, then a recovery week at 75% of
 *   the last up week. The next up week resumes from the week before the
 *   recovery week, not from the recovery week.
 * - The peak is reached in week 15 and repeated in week 17.
 * - Growth per step is chosen so the curve reaches the peak without ever
 *   passing the +10% cap. If the cap cannot reach the peak, lower the peak to
 *   reachablePeak() and let goalCheck report the gap.
 * - Taper (week 18) is 70% of peak. Race week (19) is config.raceWeekMiles.
 * - Week 1 is the starting target: at most 110% of last week's actual miles.
 *
 * reachablePeak(startMiles, weeks, config?): number
 * - The highest weekly miles the +10% cap can reach. A recovery week adds no
 *   net progress, so 15 weeks has 11 up-steps (14 weeks of change, minus
 *   recovery weeks 4, 8, 12).
 * - Check by hand: 8 miles with 11 steps of +10% is about 22.8, and 5 miles
 *   is about 14.3.
 * - The minimum step is a floor on the cap, not a forced step: each step may
 *   add up to max(10% of this week, 0.5 mile). Below 5 miles the 0.5 wins, so
 *   2 miles reaches 8.1 and 0 miles reaches 5.5.
 * - weeks means weeks up to and including the peak week. The step count is
 *   (weeks - 1) minus the recovery weeks in that range.
 *
 * How the curve is solved
 * - Each up-step is a fraction t (0 to 1) of the allowed step. The function
 *   finds t so the last up-step lands exactly on the peak. Since t never goes
 *   above 1, the cap can never be broken, and it works from a start of 0.
 * - Week 1 is startMiles as given; the 110% rule belongs to the caller.
 * - A peak below the start throws a RangeError.
 * - Very short plans work but are best effort: with no peak weeks before the
 *   taper there is nothing to climb, so the peak is the start.
 *
 * Tests: targetCurve.test.ts. Write them first.
 * Status: done.
 */
import { DEFAULT_CONFIG } from './config'
import { roundMiles } from './rounding'
import type { Config } from './types'
import { getWeekKind } from './weekStructure'

const assertMiles = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} must be a finite number of miles, 0 or more, got ${value}`,
    )
  }
}

const assertWeeks = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `${name} must be a whole number, 1 or more, got ${value}`,
    )
  }
}

/** The most one up-week may add to the week before it. */
const allowedStep = (miles: number, config: Config): number =>
  Math.max(miles * config.normalStep, config.minStepMiles)

/** Up-steps from week 1 to week `weeks`. Recovery weeks add no progress. */
const countUpSteps = (weeks: number, config: Config): number =>
  Math.max(0, weeks - 1 - Math.floor(weeks / config.recoveryEvery))

/** Climb `steps` weeks, each adding `fraction` of the allowed step. */
const climb = (
  startMiles: number,
  steps: number,
  fraction: number,
  config: Config,
): number => {
  let miles = startMiles
  for (let i = 0; i < steps; i++) {
    miles += fraction * allowedStep(miles, config)
  }
  return miles
}

/** Finds the fraction (0 to 1) of the allowed step that lands on targetMiles. */
const solveFraction = (
  startMiles: number,
  targetMiles: number,
  steps: number,
  config: Config,
): number => {
  if (targetMiles >= climb(startMiles, steps, 1, config)) return 1
  let low = 0
  let high = 1
  // Each pass halves the range, so 60 passes is far finer than a tenth mile.
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2
    if (climb(startMiles, steps, middle, config) < targetMiles) low = middle
    else high = middle
  }
  return (low + high) / 2
}

export const reachablePeak: (
  startMiles: number,
  weeks: number,
  config?: Config,
) => number = (startMiles, weeks, config = DEFAULT_CONFIG) => {
  assertMiles('reachablePeak: startMiles', startMiles)
  assertWeeks('reachablePeak: weeks', weeks)
  return roundMiles(climb(startMiles, countUpSteps(weeks, config), 1, config))
}

export const buildTargetCurve: (
  startMiles: number,
  peakMiles: number,
  totalWeeks: number,
  config?: Config,
) => number[] = (
  startMiles,
  peakMiles,
  totalWeeks,
  config = DEFAULT_CONFIG,
) => {
  assertMiles('buildTargetCurve: startMiles', startMiles)
  assertMiles('buildTargetCurve: peakMiles', peakMiles)
  assertWeeks('buildTargetCurve: totalWeeks', totalWeeks)
  if (peakMiles < startMiles) {
    throw new RangeError(
      `buildTargetCurve: peakMiles (${peakMiles}) is below startMiles (${startMiles})`,
    )
  }

  const kinds = Array.from({ length: totalWeeks }, (_, i) =>
    getWeekKind(i + 1, totalWeeks, config),
  )

  // The first peak week is where the climb ends. With no peak week there is
  // nothing to climb to, so the peak falls back to the start.
  const firstPeakWeek = kinds.indexOf('peak') + 1 // 0 when there is none
  const steps = firstPeakWeek === 0 ? 0 : countUpSteps(firstPeakWeek, config)

  // Lower the peak to what the cap can reach (goalCheck reports the gap).
  const peak = Math.min(peakMiles, climb(startMiles, steps, 1, config))
  const fraction = solveFraction(startMiles, peak, steps, config)

  // `level` is the last up week. Recovery weeks read it but never change it,
  // which is why the week after a recovery week resumes from the week before.
  let level = startMiles
  return kinds.map((kind, i) => {
    switch (kind) {
      case 'race':
        return roundMiles(config.raceWeekMiles)
      case 'taper':
        return roundMiles(config.taperFactor * peak)
      case 'recovery':
        return roundMiles(config.recoveryFactor * level)
      case 'peak':
        level = peak
        return roundMiles(level)
      case 'build':
        if (i > 0) level += fraction * allowedStep(level, config)
        return roundMiles(level)
    }
  })
}
