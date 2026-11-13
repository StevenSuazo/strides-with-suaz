import { describe, expect, it } from 'vitest'
import { buildTargetCurve } from './targetCurve'
import { gate } from './gate'
import type { GateState, WeekResult } from './types'

const flat = (miles: number): number[] => Array(19).fill(miles)
const fresh: GateState = {
  reducedMode: false,
  goodWeeksInRow: 0,
  lastLongRunMiles: 4,
}
const week = (
  weekIndex: number,
  targetMiles: number,
  actualMiles: number,
  highestPain = 0,
  longRunMiles = 4,
): WeekResult => ({
  weekIndex,
  targetMiles,
  actualMiles,
  longRunMiles,
  highestPain,
})

describe('gate: decisions', () => {
  it('advances: target 10, actual 10, low pain, curve next 12 gives next 11.0', () => {
    const result = gate(week(1, 10, 10), flat(12), fresh)
    expect(result.decision).toBe('advance')
    expect(result.next.weekIndex).toBe(2)
    expect(result.next.targetMiles).toBe(11)
  })

  it('treats a ratio of exactly 0.90 as advance: target 10, actual 9 gives next 9.9', () => {
    const result = gate(week(1, 10, 9), flat(12), fresh)
    expect(result.decision).toBe('advance')
    expect(result.next.targetMiles).toBe(9.9)
  })

  it('treats exactly 0.90 as advance even when decimals fall just under it', () => {
    const result = gate(week(1, 9, 8.1), flat(12), fresh)
    expect(result.decision).toBe('advance')
  })

  it('repeats between 0.80 and 0.90: target 10, actual 8.5 gives next 10', () => {
    const result = gate(week(1, 10, 8.5), flat(12), fresh)
    expect(result.decision).toBe('repeat')
    expect(result.next.targetMiles).toBe(10)
    expect(result.reducedMode).toBe(false)
  })

  it('treats exactly 0.80 as repeat even when decimals fall just under it', () => {
    expect(gate(week(1, 10, 8), flat(12), fresh).decision).toBe('repeat')
    expect(gate(week(1, 7, 5.6), flat(12), fresh).decision).toBe('repeat')
  })

  it('steps back under 0.80: target 10, actual 7 gives next 7.0 with reduced mode on', () => {
    const result = gate(week(1, 10, 7), flat(12), fresh)
    expect(result.decision).toBe('stepBack')
    expect(result.next.targetMiles).toBe(7)
    expect(result.reducedMode).toBe(true)
  })

  it('floors a step back at 70% of the target when the week was nearly skipped', () => {
    expect(gate(week(1, 10, 0), flat(12), fresh).next.targetMiles).toBe(7)
    expect(gate(week(1, 10, 3), flat(12), fresh).next.targetMiles).toBe(7)
  })

  it('steps back on pain over the threshold: target 10, actual 10, pain 4 gives next 7.0', () => {
    const result = gate(week(1, 10, 10, 4), flat(12), fresh)
    expect(result.decision).toBe('stepBack')
    expect(result.next.targetMiles).toBe(7)
    expect(result.reducedMode).toBe(true)
  })

  it('does not step back for pain exactly at the threshold', () => {
    expect(gate(week(1, 10, 10, 3), flat(12), fresh).decision).toBe('advance')
  })

  it('uses the minimum step at low mileage: target 4, actual 4, curve next 6 gives 4.5', () => {
    expect(gate(week(1, 4, 4), flat(6), fresh).next.targetMiles).toBe(4.5)
  })

  it('caps the advance at the curve target', () => {
    const result = gate(week(1, 10, 10), flat(10.4), fresh)
    expect(result.next.targetMiles).toBe(10.4)
  })

  it('advances from what I ran, so running over target counts', () => {
    const result = gate(week(1, 10, 13), flat(20), fresh)
    expect(result.decision).toBe('advance')
    expect(result.next.targetMiles).toBe(14.3)
  })

  it('keeps the long run from growing in a pain step-back week', () => {
    const result = gate(week(1, 10, 10, 4, 3), flat(12), {
      ...fresh,
      lastLongRunMiles: 3,
    })
    expect(result.next.longRunMiles).toBe(3)
  })

  it('grows the long run by a mile after a good week', () => {
    expect(gate(week(1, 10, 10, 0, 4), flat(12), fresh).next.longRunMiles).toBe(
      5,
    )
  })

  it('does not grow with the weekly miles: advances never move week miles down', () => {
    const targets = [10, 10.5, 11, 11.5, 12].map(
      (actual) => gate(week(1, 12, actual), flat(30), fresh).next.targetMiles,
    )
    const sorted = [...targets].sort((a, b) => a - b)
    expect(targets).toEqual(sorted)
  })
})

describe('gate: reduced mode', () => {
  const reduced: GateState = { ...fresh, reducedMode: true }

  it('uses +5% (minimum 0.25 mile) while reduced mode is on', () => {
    const big = gate(week(1, 20, 20), flat(30), reduced)
    expect(big.next.targetMiles).toBe(21)
    expect(big.reducedMode).toBe(true)
    const small = gate(week(1, 4, 4), flat(30), reduced)
    expect(small.next.targetMiles).toBe(4.3)
  })

  it('turns reduced mode off after two weeks in a row at or above 0.90', () => {
    const first = gate(week(1, 10, 10), flat(30), reduced)
    expect(first.reducedMode).toBe(true)
    expect(first.state.goodWeeksInRow).toBe(1)
    const second = gate(week(2, 10.5, 10.5), flat(30), first.state)
    expect(second.reducedMode).toBe(false)
    expect(second.next.targetMiles).toBe(11.6)
  })

  it('resets the good-weeks counter after a week below 0.90', () => {
    const good = gate(week(1, 10, 10), flat(30), reduced)
    const repeat = gate(week(2, 10.5, 9), flat(30), good.state)
    expect(repeat.state.goodWeeksInRow).toBe(0)
    expect(repeat.reducedMode).toBe(true)
    const again = gate(week(3, 10.5, 10.5), flat(30), repeat.state)
    expect(again.reducedMode).toBe(true)
  })

  it('returns the new state to pass in next week', () => {
    const result = gate(week(1, 10, 7), flat(12), fresh)
    expect(result.state).toEqual({
      reducedMode: true,
      goodWeeksInRow: 0,
      lastLongRunMiles: 4,
    })
  })
})

describe('gate: recovery, taper, and race weeks', () => {
  const curve = buildTargetCurve(10, 22, 19)

  it('sets a recovery week to 75% of the last up week with no gate', () => {
    const result = gate(week(3, 11.5, 11.5), curve, fresh)
    expect(result.decision).toBe('recovery')
    expect(result.next.weekIndex).toBe(4)
    expect(result.next.targetMiles).toBe(8.6)
  })

  it('bases the recovery week on what I ran when that was less than the target', () => {
    expect(gate(week(3, 11.5, 10), curve, fresh).next.targetMiles).toBe(7.5)
  })

  it('does not change the good-weeks count or reduced mode on the way into a recovery week', () => {
    const state: GateState = { ...fresh, reducedMode: true, goodWeeksInRow: 1 }
    const result = gate(week(3, 11.5, 11.5), curve, state)
    expect(result.reducedMode).toBe(true)
    expect(result.state.goodWeeksInRow).toBe(1)
  })

  it('resumes from the week before a recovery week', () => {
    const into = gate(week(3, 11.5, 11.5, 0, 6), curve, {
      ...fresh,
      lastLongRunMiles: 6,
    })
    const out = gate(week(4, 8.6, 8.6, 0, 4.5), curve, into.state)
    expect(out.decision).toBe('advance')
    expect(out.next.weekIndex).toBe(5)
    expect(out.next.targetMiles).toBe(12.4)
    expect(out.next.longRunMiles).toBe(6.2)
    expect(out.reason.startsWith('Recovery week done.')).toBe(true)
  })

  it('judges the week before recovery, not the easy week, and uses the worse pain', () => {
    const into = gate(week(3, 11.5, 10), curve, fresh)
    const out = gate(week(4, 8.6, 8.6), curve, into.state)
    expect(out.decision).toBe('repeat')
    expect(out.next.targetMiles).toBe(11.5)
    const painful = gate(week(4, 8.6, 8.6, 4), curve, {
      ...fresh,
      weekBeforeRecovery: week(3, 11.5, 11.5),
    })
    expect(painful.decision).toBe('stepBack')
  })

  it('uses fixed fractions for the taper and race weeks', () => {
    const taper = gate(week(17, 22, 22), curve, fresh)
    expect(taper.decision).toBe('taper')
    expect(taper.next.targetMiles).toBe(15.4)
    const race = gate(week(18, 15.4, 15.4), curve, fresh)
    expect(race.decision).toBe('race')
    expect(race.next.targetMiles).toBe(8)
  })

  it('does not gate taper or race weeks even after a bad week', () => {
    expect(gate(week(17, 22, 5, 9), curve, fresh).next.targetMiles).toBe(15.4)
  })

  it('throws after the last week of the plan', () => {
    expect(() => gate(week(19, 8, 8), curve, fresh)).toThrow(RangeError)
  })
})

describe('gate: reasons and bad input', () => {
  it('always returns a plain-English reason', () => {
    const cases = [
      gate(week(1, 10, 10), flat(12), fresh),
      gate(week(1, 10, 8.5), flat(12), fresh),
      gate(week(1, 10, 7), flat(12), fresh),
      gate(week(1, 10, 10, 4), flat(12), fresh),
      gate(week(3, 11.5, 11.5), buildTargetCurve(10, 22, 19), fresh),
    ]
    cases.forEach((result) => {
      expect(result.reason.length).toBeGreaterThan(10)
      expect(result.reason).not.toMatch(/NaN|undefined/)
    })
  })

  it('names the numbers in the reason', () => {
    const result = gate(week(1, 10, 8.5), flat(12), fresh)
    expect(result.reason).toBe(
      'Ran 8.5 of 10.0 miles (85%), so next week repeats 10.0 miles.',
    )
  })

  it('throws a RangeError for negative or NaN miles', () => {
    expect(() => gate(week(1, 10, -1), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 10, NaN), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 0, 5), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 10, 10), [10, NaN], fresh)).toThrow(RangeError)
  })

  it('throws a RangeError for pain outside 0 to 10', () => {
    expect(() => gate(week(1, 10, 10, -1), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 10, 10, 11), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 10, 10, NaN), flat(12), fresh)).toThrow(
      RangeError,
    )
  })

  it('throws a RangeError for a bad week index or an empty curve', () => {
    expect(() => gate(week(0, 10, 10), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1.5, 10, 10), flat(12), fresh)).toThrow(RangeError)
    expect(() => gate(week(1, 10, 10), [], fresh)).toThrow(RangeError)
  })
})
