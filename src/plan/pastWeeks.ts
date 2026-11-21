/**
 * pastWeeks.ts: the target a finished week was given.
 *
 * targetForWeek(view, weekIndex): week 1 starts from the plan's first numbers;
 * every later week got the target the gate handed on after the week before.
 * Undefined for a week that has not been settled yet (or is out of range).
 * The calendar uses it to rebuild which runs were planned in a past week.
 */
import type { WeekTarget } from '../engine/types'
import type { PlanView } from './progress'
import { PLAN, type PlanSettings } from './settings'

export const targetForWeek = (
  view: PlanView,
  weekIndex: number,
  settings: PlanSettings = PLAN,
): WeekTarget | undefined => {
  if (weekIndex === 1) {
    return {
      weekIndex: 1,
      targetMiles: view.curve[0],
      longRunMiles: settings.startLongRunMiles,
    }
  }
  return view.weeks[weekIndex - 2]?.gate?.next
}
