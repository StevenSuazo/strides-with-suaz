/**
 * gate.ts: the weekly decision. Advance, repeat, or step back.
 *
 * What it does: after each week, compares what I ran with that week's target,
 * looks at the highest pain number, and decides next week's target. This is
 * the heart of the engine.
 *
 * gate(lastWeek, curve, state, config?): GateResult
 * - ratio = actual / target.
 *
 * | Ratio          | Pain            | Decision | Next target                        |
 * | -------------- | --------------- | -------- | ---------------------------------- |
 * | 0.90 or more   | at or under     | advance  | min(curve next,                    |
 * |                | threshold       |          |   max(actual x 1.10, actual + 0.5))|
 * | 0.80 to 0.90   | at or under     | repeat   | same target again                  |
 * | under 0.80     | any             | stepBack | actual miles; reduced mode on      |
 * | any            | over threshold  | stepBack | 0.70 x this week's target; long    |
 * |                |                 |          |   run does not grow; reduced on    |
 *
 * - Recovery weeks, taper, and race week have no gate: they use fixed
 *   fractions (see weekStructure and targetCurve). After a recovery week, the
 *   next advance starts from the week before it.
 * - Reduced mode means +5% (minimum 0.25 mile) instead of +10% (minimum 0.5).
 *   It turns off after two weeks in a row at or above 0.90.
 * - A ratio of exactly 0.90 is an advance.
 * - Next long run comes from nextLongRun.
 * - reason is a plain-English sentence for the UI, for example "Ran 9.0 of
 *   10.0 miles with low pain, so next week adds 10%."
 * - If the scheduler reported a week short by some miles, the caller lowers
 *   the target it passes in, so the gate compares against the real target.
 *
 * Throw a RangeError for negative or NaN miles, or pain outside 0 to 10.
 *
 * Tests: gate.test.ts. Write them first (examples are in the spec, section 7).
 * Status: stub, throws until implemented.
 */
import type { Config, GateResult, GateState, WeekResult } from './types'

export const gate: (
  lastWeek: WeekResult,
  curve: number[],
  state: GateState,
  config?: Config,
) => GateResult = () => {
  throw new Error('gate: not implemented')
}
