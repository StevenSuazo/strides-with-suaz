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
 * - Decide what happens when the 50% cap is below lastLongRun (a short week):
 *   probably the cap wins. Write the decision in the test.
 *
 * Tests: longRun.test.ts. Write them first.
 * Status: stub, throws until implemented.
 */
import type { Config } from './types'

export const nextLongRun: (
  lastLongRun: number,
  weekMiles: number,
  config?: Config,
) => number = () => {
  throw new Error('nextLongRun: not implemented')
}
