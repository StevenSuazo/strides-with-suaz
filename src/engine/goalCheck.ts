/**
 * goalCheck.ts: says whether the race goal is still realistic.
 *
 * goalCheck(goalPeakMiles, curve, actuals, config?): GoalCheck
 * Compares the peak I want with the peak the +10% cap can reach from where I
 * actually am. goalPeakMiles is passed in because buildTargetCurve already
 * lowers a peak the cap cannot reach, so the curve alone would look on track.
 * - Starts from the latest finished non-recovery week, up to the peak week.
 *   With nothing finished it starts from week 1 at the curve's first target.
 * - gapMiles is never negative. onTrack needs config.goalOnTrackShare of the
 *   goal. Bad miles or an empty curve throw a RangeError.
 */
import { DEFAULT_CONFIG } from './config'
import { roundMiles } from './rounding'
import { reachableFrom } from './targetCurve'
import type { Config, GoalCheck } from './types'
import { isRecoveryWeek } from './weekStructure'

const assertMiles = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `goalCheck: ${name} must be a finite number of miles, 0 or more, got ${value}`,
    )
  }
}

export const goalCheck: (
  goalPeakMiles: number,
  curve: number[],
  actuals: number[],
  config?: Config,
) => GoalCheck = (goalPeakMiles, curve, actuals, config = DEFAULT_CONFIG) => {
  assertMiles('goalPeakMiles', goalPeakMiles)
  if (curve.length === 0) {
    throw new RangeError('goalCheck: curve must have at least one week')
  }
  curve.forEach((miles) => assertMiles('curve', miles))
  actuals.forEach((miles) => assertMiles('actuals', miles))

  const peakWeek = curve.indexOf(Math.max(...curve)) + 1

  // 0 means no usable finished week, so start from the plan's own week 1.
  let startWeek = 0
  for (let week = Math.min(actuals.length, peakWeek); week >= 1; week--) {
    if (!isRecoveryWeek(week, config)) {
      startWeek = week
      break
    }
  }
  const startMiles = startWeek === 0 ? curve[0] : actuals[startWeek - 1]

  const reachablePeakMiles = reachableFrom(
    startMiles,
    Math.max(startWeek, 1),
    peakWeek,
    config,
  )

  return {
    onTrack: reachablePeakMiles >= goalPeakMiles * config.goalOnTrackShare,
    gapMiles: roundMiles(Math.max(0, goalPeakMiles - reachablePeakMiles)),
    reachablePeakMiles,
  }
}
