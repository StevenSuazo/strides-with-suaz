/**
 * longRun.ts: picks the next long run.
 *
 * nextLongRun(lastLongRun, weekMiles, config?)
 * - Grows by at most config.longRunStepMiles (1 mile), and never goes over
 *   config.longRunMaxShare (50%) of weekMiles.
 * - When the cap is below lastLongRun (a short week), the cap wins, so the
 *   long run can shrink. After a recovery week the caller passes the long run
 *   from the week before it.
 * - Negative, NaN, or infinite miles throw a RangeError.
 */
import { DEFAULT_CONFIG } from './config'
import { roundMiles } from './rounding'
import type { Config } from './types'

const assertValidMiles = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `nextLongRun: ${name} must be a finite number of miles, 0 or more, got ${value}`,
    )
  }
}

export const nextLongRun: (
  lastLongRun: number,
  weekMiles: number,
  config?: Config,
) => number = (lastLongRun, weekMiles, config = DEFAULT_CONFIG) => {
  assertValidMiles('lastLongRun', lastLongRun)
  assertValidMiles('weekMiles', weekMiles)

  const stepped = lastLongRun + config.longRunStepMiles
  const cap = weekMiles * config.longRunMaxShare

  return roundMiles(Math.min(stepped, cap))
}
