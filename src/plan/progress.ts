/**
 * progress.ts: where the plan stands today.
 *
 * computePlan({ runs, checkIns, savedResults, today, settings?, config? })
 * Replays the plan from week 1 every time, so nothing stored can go stale:
 * 1. Every week that has ended is rebuilt from the runs and check-ins, using
 *    the target the gate set for it. Saved targets are never trusted.
 * 2. The gate is run on each ended week in order, carrying its state forward.
 *    The last week (race week) is recorded but not gated.
 * 3. The result is this week's target, and the gate's decision and reason
 *    from the week before.
 * resultsToSave lists the ended weeks that are new or differ from savedResults,
 * so the caller can save only what changed. Fixing an old run therefore
 * re-derives that week and every target after it.
 * status is notStarted before the start date, finished after week 19 ends.
 * milesSoFar is the miles in today's week. projectedNext is a look ahead while
 * a week is in progress (and it is not the last): the target the gate would give
 * next week if this week ends exactly on its target with no pain. It is a
 * projection only, and changes as the real week plays out. A bad date throws a RangeError.
 */
import {
  DEFAULT_CONFIG,
  buildTargetCurve,
  gate,
  goalCheck,
  weekIndexForDate,
} from '../engine'
import type {
  CheckIn,
  Config,
  Decision,
  GateResult,
  GateState,
  GoalCheck,
  IsoDate,
  Run,
  WeekResult,
  WeekTarget,
} from '../engine/types'
import { assertDate } from './days'
import { PLAN, type PlanSettings } from './settings'
import { buildWeekResult } from './weekResult'

export type SettledWeek = { result: WeekResult; gate?: GateResult }

export type PlanView = {
  status: 'notStarted' | 'inProgress' | 'finished'
  weekIndex?: number
  target?: WeekTarget
  decision?: Decision
  reason?: string
  milesSoFar: number
  projectedNext?: WeekTarget
  weeks: SettledWeek[]
  curve: number[]
  goal: GoalCheck
  resultsToSave: WeekResult[]
}

type Input = {
  runs: Run[]
  checkIns: CheckIn[]
  savedResults: WeekResult[]
  today: IsoDate
  settings?: PlanSettings
  config?: Config
}

const sameResult = (a: WeekResult, b: WeekResult): boolean =>
  a.weekIndex === b.weekIndex &&
  a.targetMiles === b.targetMiles &&
  a.actualMiles === b.actualMiles &&
  a.longRunMiles === b.longRunMiles &&
  a.highestPain === b.highestPain

export const computePlan: (input: Input) => PlanView = ({
  runs,
  checkIns,
  savedResults,
  today,
  settings = PLAN,
  config = DEFAULT_CONFIG,
}) => {
  assertDate('computePlan: today', today)

  const { startDate, totalWeeks } = settings
  const curve = buildTargetCurve(
    settings.startMiles,
    settings.peakMiles,
    totalWeeks,
    config,
  )

  const todayWeek = today < startDate ? 0 : weekIndexForDate(today, startDate)
  const ended = todayWeek === 0 ? 0 : Math.min(todayWeek - 1, totalWeeks)

  let state: GateState = {
    reducedMode: false,
    goodWeeksInRow: 0,
    lastLongRunMiles: settings.startLongRunMiles,
  }
  let target: WeekTarget | undefined = {
    weekIndex: 1,
    targetMiles: curve[0],
    longRunMiles: settings.startLongRunMiles,
  }
  let lastGate: GateResult | undefined
  const weeks: SettledWeek[] = []

  for (let weekIndex = 1; weekIndex <= ended; weekIndex++) {
    const result = buildWeekResult({
      weekIndex,
      targetMiles: target!.targetMiles,
      runs,
      checkIns,
      planStart: startDate,
    })
    if (weekIndex < totalWeeks) {
      lastGate = gate(result, curve, state, config)
      state = lastGate.state
      target = lastGate.next
      weeks.push({ result, gate: lastGate })
    } else {
      target = undefined
      lastGate = undefined
      weeks.push({ result })
    }
  }

  const status =
    todayWeek === 0
      ? 'notStarted'
      : todayWeek > totalWeeks
        ? 'finished'
        : 'inProgress'

  const milesSoFar =
    status === 'inProgress'
      ? buildWeekResult({
          weekIndex: todayWeek,
          targetMiles: target?.targetMiles ?? 0,
          runs,
          checkIns,
          planStart: startDate,
        }).actualMiles
      : 0

  const projectedNext =
    status === 'inProgress' && target && todayWeek < totalWeeks
      ? gate(
          {
            weekIndex: todayWeek,
            targetMiles: target.targetMiles,
            actualMiles: target.targetMiles,
            longRunMiles: target.longRunMiles,
            highestPain: 0,
          },
          curve,
          state,
          config,
        ).next
      : undefined

  const resultsToSave = weeks
    .map((week) => week.result)
    .filter((result) => {
      const saved = savedResults.find((s) => s.weekIndex === result.weekIndex)
      return !saved || !sameResult(saved, result)
    })

  return {
    status,
    ...(status === 'inProgress' ? { weekIndex: todayWeek } : {}),
    ...(target ? { target } : {}),
    ...(lastGate
      ? { decision: lastGate.decision, reason: lastGate.reason }
      : {}),
    milesSoFar,
    ...(projectedNext ? { projectedNext } : {}),
    weeks,
    curve,
    goal: goalCheck(
      settings.peakMiles,
      curve,
      weeks.map((week) => week.result.actualMiles),
      config,
    ),
    resultsToSave,
  }
}
