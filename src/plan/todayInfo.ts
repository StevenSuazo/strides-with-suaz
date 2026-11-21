/**
 * todayInfo.ts: what today looks like in the week's plan.
 *
 * todayInfo(weekStart, rows, extraRuns, today) gives, for the Today card and
 * the Today page: the kind (easy, long, rest or extra), its title, the miles,
 * whether it is done (with the miles you ran), and on a rest day the next run
 * still to do this week. It is undefined when today is outside the week.
 */
import type { IsoDate, Run, RunKind } from '../engine/types'
import type { AdviceKind } from './runAdvice'
import { dateOfDay, type PlannedRow } from './weekMatch'

export type TodayInfo = {
  kind: AdviceKind
  title: string
  miles?: number
  status?: 'done' | 'todo'
  ran?: number
  next?: { date: IsoDate; kind: RunKind; miles: number }
}

const TITLE = { easy: 'Easy run', long: 'Long run' }

export const todayInfo = (
  weekStart: IsoDate,
  rows: PlannedRow[],
  extraRuns: Run[],
  today: IsoDate,
): TodayInfo | undefined => {
  const todayIndex = [0, 1, 2, 3, 4, 5, 6].find(
    (dayIndex) => dateOfDay(weekStart, dayIndex) === today,
  )
  if (todayIndex === undefined) return undefined

  const planned = rows.find((row) => row.dayIndex === todayIndex)
  if (planned) {
    const { kind, miles } = planned.workout
    return planned.status === 'done' && planned.run
      ? {
          kind,
          title: TITLE[kind],
          miles,
          status: 'done',
          ran: planned.run.miles,
        }
      : { kind, title: TITLE[kind], miles, status: 'todo' }
  }

  const extraMiles = extraRuns
    .filter((run) => run.date === today)
    .reduce((sum, run) => sum + run.miles, 0)
  if (extraMiles > 0) {
    return {
      kind: 'extra',
      title: 'Extra run',
      miles: extraMiles,
      status: 'done',
    }
  }

  const next = rows.find(
    (row) => row.dayIndex > todayIndex && row.status !== 'done',
  )
  return next
    ? {
        kind: 'rest',
        title: 'Rest day',
        next: {
          date: next.workout.date,
          kind: next.workout.kind,
          miles: next.workout.miles,
        },
      }
    : { kind: 'rest', title: 'Rest day' }
}
