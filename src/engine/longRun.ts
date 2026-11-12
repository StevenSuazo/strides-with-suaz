/**
 * longRun.ts: picks the next long run.
 *
 * What it does: grows the long run slowly and never lets it swallow the week.
 *
 * nextLongRun(lastLongRun, weekMiles, config?)
 * - Grows by at most config.longRunStepMiles (1 mile) from the last
 *   non-recovery long run.
 * - Never more than config.longRunMaxShare (50%) of weekMiles.
 * - After a recovery week the caller passes the long run from the week before
 *   it, so this function does not need to know about recovery weeks.
 * - Returns miles rounded with roundMiles.
 * - When the 50% cap is below lastLongRun (a short week), the cap wins, so
 *   the long run can shrink. The share is a safety limit, not a target.
 *
 * Tests: longRun.test.ts.
 * Status: done.
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

  // The cap wins even when it is below lastLongRun (a short week).
  return roundMiles(Math.min(stepped, cap))
}
