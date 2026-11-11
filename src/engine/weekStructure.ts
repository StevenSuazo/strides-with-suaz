/**
 * weekStructure.ts: says what kind of week each week is.
 *
 * What it does: keeps the "which weeks are recovery, peak, taper, or race"
 * logic out of the curve builder, so it is not tangled inside it.
 *
 * Rules (for the 19-week plan)
 * - Every 4th week is recovery: weeks 4, 8, 12, 16.
 * - The last week is race week (19). The week before it is taper (18).
 * - Peak weeks are the last two non-recovery weeks before the taper: weeks 15
 *   and 17 (16 is a recovery week between them).
 * - Everything else is build.
 * - Write it so it still works for a different totalWeeks (a plan with
 *   fewer weeks left), not only 19.
 *
 * Functions
 * - getWeekKind(weekIndex, totalWeeks, config?) returns a WeekKind.
 * - isRecoveryWeek(weekIndex, config?) uses config.recoveryEvery.
 *
 * Tests: weekStructure.test.ts. Write them first.
 * Status: stubs, throw until implemented.
 */
import type { Config, WeekKind } from './types'

export const getWeekKind: (
  weekIndex: number,
  totalWeeks: number,
  config?: Config,
) => WeekKind = () => {
  throw new Error('getWeekKind: not implemented')
}

export const isRecoveryWeek: (
  weekIndex: number,
  config?: Config,
) => boolean = () => {
  throw new Error('isRecoveryWeek: not implemented')
}
