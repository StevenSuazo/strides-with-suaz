/**
 * goalCheck.ts: says whether the race goal is still realistic.
 *
 * What it does: compares the peak the target curve asks for with the peak the
 * +10% cap can actually reach from where I really am, and reports the gap.
 * It is the honest signal ("from 5 miles a week, a 22-mile peak is out of
 * reach") instead of a false "on track".
 *
 * goalCheck(curve, actuals, config?): GoalCheck
 * - curve: planned miles for every week. actuals: actual miles for each
 *   finished week, so the current week is actuals.length + 1.
 * - Simulate the capped path from the latest actual week to the curve's peak
 *   week (use reachablePeak).
 * - onTrack is false when the reachable peak is below about 90% of the
 *   curve's peak. gapMiles is the shortfall, never negative.
 * - Decide what to return before any week is finished (no actuals).
 *
 * Tests: goalCheck.test.ts. Write them first.
 * Status: stub, throws until implemented.
 */
import type { Config, GoalCheck } from './types'

export const goalCheck: (
  curve: number[],
  actuals: number[],
  config?: Config,
) => GoalCheck = () => {
  throw new Error('goalCheck: not implemented')
}
