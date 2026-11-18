import { describe, expect, it } from 'vitest'
import type { CheckIn, Run } from '../engine/types'
import { buildWeekResult } from './weekResult'

const planStart = '2026-11-09'

const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})

const checkIn = (
  id: string,
  date: string,
  pains: number[],
  kind: CheckIn['kind'] = 'afterRun',
): CheckIn => ({
  id,
  date,
  feel: 'good',
  kind,
  entries: pains.map((pain) => ({ area: 'knee', side: 'left', pain })),
})

const build = (
  weekIndex: number,
  runs: Run[] = [],
  checkIns: CheckIn[] = [],
  targetMiles = 8.5,
) => buildWeekResult({ weekIndex, targetMiles, runs, checkIns, planStart })

describe('buildWeekResult: miles', () => {
  it('sums the runs in the week and finds the longest', () => {
    const result = build(1, [
      run('a', '2026-11-09', 2.05),
      run('b', '2026-11-11', 2.5),
      run('c', '2026-11-15', 4.01),
    ])
    expect(result).toEqual({
      weekIndex: 1,
      targetMiles: 8.5,
      actualMiles: 8.56,
      longRunMiles: 4.01,
      highestPain: 0,
    })
  })

  it('removes floating-point noise: 0.1 + 0.2 gives 0.3', () => {
    const result = build(1, [
      run('a', '2026-11-09', 0.1),
      run('b', '2026-11-10', 0.2),
    ])
    expect(result.actualMiles).toBe(0.3)
  })

  it('counts the first and last day of the week, Monday and Sunday', () => {
    const result = build(2, [
      run('a', '2026-11-16', 3),
      run('b', '2026-11-22', 4),
    ])
    expect(result.actualMiles).toBe(7)
  })

  it('ignores runs from other weeks', () => {
    const result = build(1, [
      run('before', '2026-11-08', 5),
      run('in', '2026-11-12', 3),
      run('after', '2026-11-16', 6),
    ])
    expect(result.actualMiles).toBe(3)
    expect(result.longRunMiles).toBe(3)
  })

  it('ignores runs before the plan starts without throwing', () => {
    expect(build(1, [run('old', '2025-01-01', 9)]).actualMiles).toBe(0)
  })

  it('gives zeros for a week with no runs', () => {
    const result = build(3)
    expect(result.actualMiles).toBe(0)
    expect(result.longRunMiles).toBe(0)
    expect(result.highestPain).toBe(0)
  })

  it('takes the longest single run as the long run', () => {
    const result = build(1, [
      run('a', '2026-11-09', 3),
      run('b', '2026-11-11', 5),
      run('c', '2026-11-13', 2),
    ])
    expect(result.longRunMiles).toBe(5)
  })

  it('passes the week and the target through', () => {
    const result = build(4, [], [], 7.6)
    expect(result.weekIndex).toBe(4)
    expect(result.targetMiles).toBe(7.6)
  })
})

describe('buildWeekResult: pain', () => {
  it('takes the highest pain across check-ins and their entries', () => {
    const result = build(
      1,
      [],
      [checkIn('a', '2026-11-10', [2, 1]), checkIn('b', '2026-11-12', [4, 0])],
    )
    expect(result.highestPain).toBe(4)
  })

  it('treats a check-in with no entries as no pain', () => {
    expect(build(1, [], [checkIn('a', '2026-11-10', [])]).highestPain).toBe(0)
  })

  it('ignores check-ins from other weeks', () => {
    const result = build(
      1,
      [],
      [checkIn('a', '2026-11-08', [9]), checkIn('b', '2026-11-16', [7])],
    )
    expect(result.highestPain).toBe(0)
  })

  it('counts a next-morning check-in toward the day before', () => {
    const sundayRunReportedMonday = checkIn(
      'a',
      '2026-11-16',
      [6],
      'nextMorning',
    )
    expect(build(1, [], [sundayRunReportedMonday]).highestPain).toBe(6)
    expect(build(2, [], [sundayRunReportedMonday]).highestPain).toBe(0)
  })

  it('does not pull a Monday next-morning check-in into the week before the plan', () => {
    const mondayReport = checkIn('a', '2026-11-09', [8], 'nextMorning')
    expect(build(1, [], [mondayReport]).highestPain).toBe(0)
  })

  it('counts an after-run check-in on its own date', () => {
    const sundayAfterRun = checkIn('a', '2026-11-15', [5])
    expect(build(1, [], [sundayAfterRun]).highestPain).toBe(5)
  })
})

describe('buildWeekResult: bad input', () => {
  it('throws a RangeError for a week below 1 or a fractional week', () => {
    expect(() => build(0)).toThrow(RangeError)
    expect(() => build(1.5)).toThrow(RangeError)
  })
})
