/**
 * targetCurve.ts: builds the planned weekly miles for every week.
 *
 * buildTargetCurve(startMiles, peakMiles, totalWeeks, config?): number[]
 * - Index 0 is week 1, which is startMiles as given.
 * - Three up weeks, then a recovery week at 75% of the last up week. The next
 *   up week resumes from the week before the recovery week.
 * - The peak lands on the first peak week and repeats on the second. The taper
 *   is 70% of peak and race week is config.raceWeekMiles.
 * - If the cap cannot reach peakMiles, the peak is lowered to what it can.
 *   goalCheck reports the gap.
 * - Each up-step is a fraction (0 to 1) of the allowed step, found by halving
 *   the range. The cap is never broken, and a start of 0 works.
 * - Very short plans are best effort.
 *
 * reachableFrom(miles, fromWeek, toWeek, config?): number
 * - Highest weekly miles reachable in toWeek if fromWeek was run at `miles`.
 *   Each step adds up to max(10% of this week, 0.5 mile). Recovery weeks add
 *   no progress, and a recovery fromWeek counts as the up week before it.
 * - Returns `miles` if toWeek is not after fromWeek.
 * - reachablePeak(start, weeks) is reachableFrom(start, 1, weeks).
 *
 * Bad miles or weeks throw a RangeError, and so does a peak below the start.
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
  // 60 halvings is far finer than a tenth of a mile.
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2
    if (climb(startMiles, steps, middle, config) < targetMiles) low = middle
    else high = middle
  }
  return (low + high) / 2
}

export const reachableFrom: (
  miles: number,
  fromWeek: number,
  toWeek: number,
  config?: Config,
) => number = (miles, fromWeek, toWeek, config = DEFAULT_CONFIG) => {
  assertMiles('reachableFrom: miles', miles)
  assertWeeks('reachableFrom: fromWeek', fromWeek)
  assertWeeks('reachableFrom: toWeek', toWeek)
  const steps = Math.max(
    0,
    countUpSteps(toWeek, config) - countUpSteps(fromWeek, config),
  )
  return roundMiles(climb(miles, steps, 1, config))
}

export const reachablePeak: (
  startMiles: number,
  weeks: number,
  config?: Config,
) => number = (startMiles, weeks, config = DEFAULT_CONFIG) => {
  // Checked here too, so an error names the function the caller used.
  assertMiles('reachablePeak: startMiles', startMiles)
  assertWeeks('reachablePeak: weeks', weeks)
  return reachableFrom(startMiles, 1, weeks, config)
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

  // 0 when there is no peak week: nothing to climb, so the peak is the start.
  const firstPeakWeek = kinds.indexOf('peak') + 1
  const steps = firstPeakWeek === 0 ? 0 : countUpSteps(firstPeakWeek, config)

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
