/**
 * gate.ts: the weekly decision. Advance, repeat, or step back.
 *
 * gate(lastWeek, curve, state, config?): GateResult
 * Looks at the week I just finished and sets next week's target and long run.
 * ratio = actual / target.
 * - Ratio at or over 0.90 with pain at or under the threshold: advance to the
 *   smaller of the curve's next week and actual + max(10%, 0.5 mile).
 * - Ratio from 0.80 to 0.90: repeat the target.
 * - Ratio under 0.80: step back to what I ran, but never below 70% of the
 *   target, so a skipped week does not zero the plan.
 * - Pain over the threshold: step back to 70% of the target, and the long run
 *   holds. Pain is checked first.
 * - A step back turns on reduced mode (+5%, minimum 0.25 mile). Two good weeks
 *   in a row turn it off, and the step for that week already uses the new mode.
 * - The week before a recovery week is judged after the recovery week, using
 *   the worse pain of the two. The recovery week itself is 75% of the lower of
 *   its target and what I ran, and never counts as a good or bad week.
 * - Taper and race weeks come straight from the curve, with no gate.
 * - The long run comes from nextLongRun, based on the last non-recovery long
 *   run. The new state it returns is passed back in next week.
 * - Bad numbers, or a week after the last one, throw a RangeError.
 */
import { DEFAULT_CONFIG } from './config'
import { nextLongRun } from './longRun'
import { roundMiles } from './rounding'
import type {
  Config,
  Decision,
  GateResult,
  GateState,
  WeekResult,
} from './types'
import { getWeekKind } from './weekStructure'

const miles = (value: number): string => value.toFixed(1)

const assertMiles = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `gate: ${name} must be a finite number of miles, 0 or more, got ${value}`,
    )
  }
}

const assertWeek = (name: string, week: WeekResult): void => {
  if (!Number.isInteger(week.weekIndex) || week.weekIndex < 1) {
    throw new RangeError(
      `gate: ${name}.weekIndex must be a whole number, 1 or more, got ${week.weekIndex}`,
    )
  }
  if (!Number.isFinite(week.targetMiles) || week.targetMiles <= 0) {
    throw new RangeError(
      `gate: ${name}.targetMiles must be greater than 0, got ${week.targetMiles}`,
    )
  }
  assertMiles(`${name}.actualMiles`, week.actualMiles)
  assertMiles(`${name}.longRunMiles`, week.longRunMiles)
  if (
    !Number.isFinite(week.highestPain) ||
    week.highestPain < 0 ||
    week.highestPain > 10
  ) {
    throw new RangeError(
      `gate: ${name}.highestPain must be from 0 to 10, got ${week.highestPain}`,
    )
  }
}

type Evaluation = {
  decision: Decision
  targetMiles: number
  reducedMode: boolean
  goodWeeksInRow: number
  holdLongRun: boolean
  reason: string
}

const evaluate = (
  week: WeekResult,
  pain: number,
  curveNext: number,
  state: GateState,
  config: Config,
): Evaluation => {
  // Rounded so exactly 90% (8.1 of 9) is not read as 0.8999999999999999.
  const ratio = Math.round((week.actualMiles / week.targetMiles) * 1e9) / 1e9
  const percent = Math.round(ratio * 100)
  const ran = `Ran ${miles(week.actualMiles)} of ${miles(week.targetMiles)} miles`
  const lowest = week.targetMiles * config.painStepBackFactor

  if (pain > config.painThreshold) {
    const targetMiles = roundMiles(lowest)
    return {
      decision: 'stepBack',
      targetMiles,
      reducedMode: true,
      goodWeeksInRow: 0,
      holdLongRun: true,
      reason: `Pain of ${pain} is over your limit of ${config.painThreshold}, so next week steps back to ${miles(targetMiles)} miles and the long run holds.`,
    }
  }

  if (ratio < config.repeatThreshold) {
    const targetMiles = roundMiles(Math.max(week.actualMiles, lowest))
    return {
      decision: 'stepBack',
      targetMiles,
      reducedMode: true,
      goodWeeksInRow: 0,
      holdLongRun: false,
      reason: `${ran} (${percent}%), so next week steps back to ${miles(targetMiles)} miles and progress slows until you have two good weeks in a row.`,
    }
  }

  if (ratio < config.advanceThreshold) {
    return {
      decision: 'repeat',
      targetMiles: week.targetMiles,
      reducedMode: state.reducedMode,
      goodWeeksInRow: 0,
      holdLongRun: false,
      reason: `${ran} (${percent}%), so next week repeats ${miles(week.targetMiles)} miles.`,
    }
  }

  const goodWeeksInRow = state.goodWeeksInRow + 1
  const reducedMode =
    state.reducedMode && goodWeeksInRow < config.goodWeeksToLeaveReducedMode
  const step = reducedMode ? config.reducedStep : config.normalStep
  const minStep = reducedMode ? config.minStepMilesReduced : config.minStepMiles
  const stepped = week.actualMiles + Math.max(week.actualMiles * step, minStep)
  const targetMiles = roundMiles(Math.min(curveNext, stepped))
  const how = ratio > 1 ? `${ran}, more than planned` : `${ran} with low pain`
  const where =
    curveNext < stepped
      ? `to ${miles(targetMiles)} miles, the plan's target`
      : `up to ${miles(targetMiles)} miles`
  return {
    decision: 'advance',
    targetMiles,
    reducedMode,
    goodWeeksInRow,
    holdLongRun: false,
    reason: `${how}, so next week goes ${where}.`,
  }
}

export const gate: (
  lastWeek: WeekResult,
  curve: number[],
  state: GateState,
  config?: Config,
) => GateResult = (lastWeek, curve, state, config = DEFAULT_CONFIG) => {
  assertWeek('lastWeek', lastWeek)
  if (curve.length === 0) {
    throw new RangeError('gate: curve must have at least one week')
  }
  curve.forEach((value) => assertMiles('curve', value))
  assertMiles('state.lastLongRunMiles', state.lastLongRunMiles)
  if (!Number.isInteger(state.goodWeeksInRow) || state.goodWeeksInRow < 0) {
    throw new RangeError(
      `gate: state.goodWeeksInRow must be a whole number, 0 or more, got ${state.goodWeeksInRow}`,
    )
  }
  if (state.weekBeforeRecovery) {
    assertWeek('state.weekBeforeRecovery', state.weekBeforeRecovery)
  }

  const totalWeeks = curve.length
  const nextIndex = lastWeek.weekIndex + 1
  if (nextIndex > totalWeeks) {
    throw new RangeError(
      `gate: week ${lastWeek.weekIndex} is the last week of a ${totalWeeks}-week plan, so there is no next week`,
    )
  }

  const nextKind = getWeekKind(nextIndex, totalWeeks, config)
  const curveNext = curve[nextIndex - 1]
  const afterRecovery =
    getWeekKind(lastWeek.weekIndex, totalWeeks, config) === 'recovery'

  const finish = (
    decision: Decision,
    targetMiles: number,
    longRunBase: number,
    nextState: GateState,
    reason: string,
    holdLongRun = false,
  ): GateResult => ({
    next: {
      weekIndex: nextIndex,
      targetMiles,
      longRunMiles: nextLongRun(
        longRunBase,
        targetMiles,
        holdLongRun ? { ...config, longRunStepMiles: 0 } : config,
      ),
    },
    decision,
    reducedMode: nextState.reducedMode,
    reason,
    state: nextState,
  })

  if (nextKind === 'taper' || nextKind === 'race') {
    const reason =
      nextKind === 'taper'
        ? `Taper week: ${miles(curveNext)} miles, easing off before race week.`
        : `Race week: ${miles(curveNext)} miles of light running before the race.`
    const longRunBase = afterRecovery
      ? state.lastLongRunMiles
      : lastWeek.longRunMiles
    return finish(nextKind, curveNext, longRunBase, state, reason)
  }

  if (nextKind === 'recovery') {
    const lowest = lastWeek.targetMiles * config.painStepBackFactor
    const base = Math.max(
      Math.min(lastWeek.actualMiles, lastWeek.targetMiles),
      lowest,
    )
    const targetMiles = roundMiles(config.recoveryFactor * base)
    const nextState: GateState = {
      ...state,
      lastLongRunMiles: lastWeek.longRunMiles,
      weekBeforeRecovery: lastWeek,
    }
    return finish(
      'recovery',
      targetMiles,
      lastWeek.longRunMiles,
      nextState,
      `Next week is a recovery week: ${miles(targetMiles)} miles, easier on purpose.`,
    )
  }

  const judged = afterRecovery
    ? (state.weekBeforeRecovery ?? lastWeek)
    : lastWeek
  const pain = afterRecovery
    ? Math.max(judged.highestPain, lastWeek.highestPain)
    : lastWeek.highestPain
  const longRunBase = afterRecovery
    ? state.lastLongRunMiles
    : lastWeek.longRunMiles

  const result = evaluate(judged, pain, curveNext, state, config)
  const nextState: GateState = {
    reducedMode: result.reducedMode,
    goodWeeksInRow: result.goodWeeksInRow,
    lastLongRunMiles: longRunBase,
  }
  return finish(
    result.decision,
    result.targetMiles,
    longRunBase,
    nextState,
    afterRecovery ? `Recovery week done. ${result.reason}` : result.reason,
    result.holdLongRun,
  )
}
