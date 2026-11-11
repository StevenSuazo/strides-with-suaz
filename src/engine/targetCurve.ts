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
 *   is about 14.3. Decide how the minimum step (0.5 mile) enters the math.
 *
 * Tests: targetCurve.test.ts. Write them first.
 * Status: stubs, throw until implemented.
 */
import type { Config } from './types'

export const buildTargetCurve: (
  startMiles: number,
  peakMiles: number,
  totalWeeks: number,
  config?: Config,
) => number[] = () => {
  throw new Error('buildTargetCurve: not implemented')
}

export const reachablePeak: (
  startMiles: number,
  weeks: number,
  config?: Config,
) => number = () => {
  throw new Error('reachablePeak: not implemented')
}
