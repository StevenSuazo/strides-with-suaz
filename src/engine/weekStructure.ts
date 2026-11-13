/**
 * weekStructure.ts: says what kind of week each week is.
 *
 * - Every 4th week is recovery (config.recoveryEvery).
 * - The last week is race, and the week before it is taper.
 * - Peak weeks are the last two non-recovery weeks before the taper. In the
 *   19-week plan that is weeks 15 and 17, with recovery week 16 between them.
 * - Everything else is build.
 * - When rules overlap the order is race, taper, recovery, peak, build. In a
 *   12-week plan, week 12 is a multiple of 4 and race week: race wins.
 * - A week outside 1 to totalWeeks throws a RangeError.
 *
 * Works for any totalWeeks, not only 19.
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
