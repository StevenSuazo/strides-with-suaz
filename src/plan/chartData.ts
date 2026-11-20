/**
 * chartData.ts: turns a PlanView into the points for the progress chart.
 *
 * buildChart(view) returns one entry per plan week:
 * - done: a finished week, with its real target, the miles run, how close that
 *   was (level) and what the gate decided afterwards.
 * - current: the week in progress, with its target and miles so far.
 * - future: only the original curve's miles.
 * level uses the gate's own thresholds: at least advanceThreshold of the target
 * is hit, at least repeatThreshold is close, below that is short.
 * maxMiles is the top of the scale: the biggest number shown, rounded up to a
 * multiple of 5. peakIndex is the first week with the biggest curve value.
 */
import { DEFAULT_CONFIG } from '../engine/config'
import type { Decision } from '../engine/types'
import type { PlanView } from './progress'

export type ChartWeek = {
  weekIndex: number
  curveMiles: number
  kind: 'done' | 'current' | 'future'
  targetMiles?: number
  actualMiles?: number
  level?: 'hit' | 'close' | 'short'
  decision?: Decision
}

export type Chart = {
  weeks: ChartWeek[]
  maxMiles: number
  peakIndex: number
}

const levelOf = (
  actual: number,
  target: number,
): NonNullable<ChartWeek['level']> => {
  if (target <= 0 || actual >= target * DEFAULT_CONFIG.advanceThreshold) {
    return 'hit'
  }
  return actual >= target * DEFAULT_CONFIG.repeatThreshold ? 'close' : 'short'
}

export const buildChart = (view: PlanView): Chart => {
  const weeks = view.curve.map((curveMiles, index): ChartWeek => {
    const weekIndex = index + 1
    const settled = view.weeks.find((w) => w.result.weekIndex === weekIndex)
    if (settled) {
      const { targetMiles, actualMiles } = settled.result
      return {
        weekIndex,
        curveMiles,
        kind: 'done',
        targetMiles,
        actualMiles,
        level: levelOf(actualMiles, targetMiles),
        ...(settled.gate ? { decision: settled.gate.decision } : {}),
      }
    }
    if (view.status === 'inProgress' && view.weekIndex === weekIndex) {
      return {
        weekIndex,
        curveMiles,
        kind: 'current',
        targetMiles: view.target?.targetMiles ?? curveMiles,
        actualMiles: view.milesSoFar,
      }
    }
    return { weekIndex, curveMiles, kind: 'future' }
  })

  const biggest = Math.max(
    ...weeks.flatMap((w) => [
      w.curveMiles,
      w.targetMiles ?? 0,
      w.actualMiles ?? 0,
    ]),
  )
  const peak = Math.max(...view.curve)

  return {
    weeks,
    maxMiles: Math.ceil(biggest / 5) * 5,
    peakIndex: view.curve.indexOf(peak),
  }
}
