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
 * - Priority when rules overlap: race, taper, recovery, peak, build. (In a
 *   12-week plan, week 12 is both a multiple of 4 and race week: race wins.)
 *
 * Functions
 * - getWeekKind(weekIndex, totalWeeks, config?) returns a WeekKind.
 * - isRecoveryWeek(weekIndex, config?) uses config.recoveryEvery.
 *
 * Tests: weekStructure.test.ts.
 * Status: done.
 */
import type { Config, WeekKind } from './types'
import { DEFAULT_CONFIG } from './config'

const peakWeeks = (totalWeeks: number, config: Config): number[] => {
  const peaks: number[] = []
  for (let week = totalWeeks - 2; week >= 1 && peaks.length < 2; week--) {
    if (!isRecoveryWeek(week, config)) peaks.push(week)
  }
  return peaks
}

export const getWeekKind: (
  weekIndex: number,
  totalWeeks: number,
  config?: Config,
) => WeekKind = (weekIndex, totalWeeks, config = DEFAULT_CONFIG) => {
  if (weekIndex < 1 || weekIndex > totalWeeks) {
    throw new RangeError(
      `getWeekKind: week ${weekIndex} is outside 1 to ${totalWeeks}`,
    )
  }
  if (weekIndex === totalWeeks) return 'race'
  if (weekIndex === totalWeeks - 1) return 'taper'
  if (isRecoveryWeek(weekIndex, config)) return 'recovery'
  if (peakWeeks(totalWeeks, config).includes(weekIndex)) return 'peak'
  return 'build'
}

export const isRecoveryWeek: (weekIndex: number, config?: Config) => boolean = (
  weekIndex,
  config = DEFAULT_CONFIG,
) => {
  return weekIndex % config.recoveryEvery === 0
}
