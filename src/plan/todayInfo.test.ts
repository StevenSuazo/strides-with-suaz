import { describe, expect, it } from 'vitest'
import type { PlannedRun, Run } from '../engine/types'
import { todayInfo } from './todayInfo'
import { matchWeek } from './weekMatch'

const planned: PlannedRun[] = [
  { dayIndex: 0, kind: 'easy', miles: 2.3 },
  { dayIndex: 2, kind: 'easy', miles: 2.3 },
  { dayIndex: 4, kind: 'long', miles: 4.7 },
]
const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})
const info = (today: string, runs: Run[] = []) => {
  const { rows, extraRuns } = matchWeek({
    weekIndex: 2,
    weekStart: '2026-11-16',
    planned,
    runs,
    overrides: {},
    today,
  })
  return todayInfo('2026-11-16', rows, extraRuns, today)
}

describe('todayInfo', () => {
  it('describes an easy run still to do', () => {
    expect(info('2026-11-18')).toEqual({
      kind: 'easy',
      title: 'Easy run',
      miles: 2.3,
      status: 'todo',
    })
  })

  it('describes a long run', () => {
    expect(info('2026-11-20')).toMatchObject({
      kind: 'long',
      title: 'Long run',
      miles: 4.7,
    })
  })

  it('says done, with the miles ran, once the run is logged', () => {
    expect(info('2026-11-18', [run('a', '2026-11-18', 2.4)])).toMatchObject({
      kind: 'easy',
      status: 'done',
      ran: 2.4,
    })
  })

  it('describes a rest day and what comes next', () => {
    expect(info('2026-11-17')).toEqual({
      kind: 'rest',
      title: 'Rest day',
      next: { date: '2026-11-18', kind: 'easy', miles: 2.3 },
    })
  })

  it('skips a next run that is already done', () => {
    const early = [run('a', '2026-11-18', 2.3)]
    expect(info('2026-11-17', early)?.next?.date).toBe('2026-11-20')
  })

  it('has no next on a rest day with nothing left this week', () => {
    expect(info('2026-11-21')?.next).toBeUndefined()
  })

  it('describes an extra run, summing the day', () => {
    expect(
      info('2026-11-17', [
        run('x', '2026-11-17', 2),
        run('y', '2026-11-17', 1.5),
      ]),
    ).toEqual({ kind: 'extra', title: 'Extra run', miles: 3.5, status: 'done' })
  })

  it('is undefined when today is outside the week', () => {
    expect(info('2026-11-30')).toBeUndefined()
  })
})
