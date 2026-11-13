import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { buildTargetCurve, reachableFrom, reachablePeak } from './targetCurve'
import { isRecoveryWeek } from './weekStructure'

const example = (): number[] => buildTargetCurve(10, 22, 19)
const week = (curve: number[], weekIndex: number): number =>
  curve[weekIndex - 1]

describe('buildTargetCurve', () => {
  it('returns one target per week', () => {
    expect(buildTargetCurve(10, 22, 19)).toHaveLength(19)
    expect(buildTargetCurve(10, 22, 12)).toHaveLength(12)
  })

  it('starts at the starting miles', () => {
    expect(week(example(), 1)).toBe(10)
    expect(week(example(), 2)).toBe(10.7)
    expect(week(example(), 3)).toBe(11.5)
  })

  it('makes weeks 4, 8, 12, and 16 recovery weeks at 75% of the last up week', () => {
    expect(week(example(), 4)).toBe(8.7)
    expect(week(example(), 8)).toBe(10.7)
    expect(week(example(), 12)).toBe(13.3)
    expect(week(example(), 16)).toBe(16.5)
  })

  it('resumes from the week before a recovery week, not from the recovery week', () => {
    expect(week(example(), 5)).toBe(12.4)
    expect(week(example(), 9)).toBe(15.4)
    expect(week(example(), 13)).toBe(19.1)
  })

  it('reaches the peak in week 15 and repeats it in week 17', () => {
    expect(week(example(), 15)).toBe(22)
    expect(week(example(), 17)).toBe(22)
    expect(Math.max(...example().slice(0, 17))).toBe(22)
  })

  it('sets the taper (week 18) to 70% of peak and week 19 to race-week miles', () => {
    expect(week(example(), 18)).toBe(15.4)
    expect(week(example(), 19)).toBe(DEFAULT_CONFIG.raceWeekMiles)
  })

  it('never rises more than 10% (or the minimum step) from one up week to the next', () => {
    const cases: [number, number][] = [
      [10, 22],
      [8, 22],
      [5, 22],
      [4, 12],
      [2, 10],
      [0, 5],
    ]
    for (const [start, peak] of cases) {
      const curve = buildTargetCurve(start, peak, 19)
      for (let w = 2; w <= 17; w++) {
        if (isRecoveryWeek(w)) continue
        const prev = week(curve, isRecoveryWeek(w - 1) ? w - 2 : w - 1)
        const cap = Math.max(prev * DEFAULT_CONFIG.normalStep, 0.5)
        expect(week(curve, w) - prev).toBeLessThanOrEqual(cap + 0.1)
      }
    }
  })

  it('lowers the peak when the cap cannot reach it', () => {
    const curve = buildTargetCurve(5, 22, 19)
    expect(week(curve, 15)).toBe(14.3)
    expect(week(curve, 17)).toBe(14.3)
    expect(week(curve, 16)).toBe(10.7)
    expect(week(curve, 18)).toBe(10)
  })

  it('climbs by the minimum step from a start of 0 and still reaches the peak', () => {
    const curve = buildTargetCurve(0, 5, 19)
    expect(week(curve, 1)).toBe(0)
    expect(week(curve, 2)).toBe(0.5)
    expect(week(curve, 15)).toBe(5)
  })

  it('stays flat when the peak equals the start', () => {
    const curve = buildTargetCurve(10, 10, 19)
    expect(week(curve, 3)).toBe(10)
    expect(week(curve, 4)).toBe(7.5)
    expect(week(curve, 5)).toBe(10)
    expect(week(curve, 15)).toBe(10)
    expect(week(curve, 17)).toBe(10)
    expect(week(curve, 18)).toBe(7)
  })

  it('handles very short plans', () => {
    expect(buildTargetCurve(10, 22, 1)).toEqual([8])
    expect(buildTargetCurve(10, 22, 2)).toEqual([7, 8])
    expect(buildTargetCurve(10, 22, 3)).toEqual([10, 7, 8])
  })

  it('uses the settings from a custom config', () => {
    const config = {
      ...DEFAULT_CONFIG,
      recoveryEvery: 3,
      taperFactor: 0.5,
      raceWeekMiles: 5,
    }
    const curve = buildTargetCurve(10, 12, 10, config)
    expect(week(curve, 2)).toBe(10.5)
    expect(week(curve, 3)).toBe(7.8)
    expect(week(curve, 4)).toBe(11)
    expect(week(curve, 6)).toBe(8.6)
    expect(week(curve, 7)).toBe(12)
    expect(week(curve, 8)).toBe(12)
    expect(week(curve, 9)).toBe(6)
    expect(week(curve, 10)).toBe(5)
  })

  it('caps the peak at 11.8 from my real starting point of 4 miles', () => {
    expect(reachablePeak(4, 15)).toBe(11.8)
    const curve = buildTargetCurve(4, 22, 19)
    expect(week(curve, 15)).toBe(11.8)
    expect(week(curve, 17)).toBe(11.8)
  })

  it('throws a RangeError for negative, NaN, or Infinity miles', () => {
    expect(() => buildTargetCurve(-1, 22, 19)).toThrow(RangeError)
    expect(() => buildTargetCurve(NaN, 22, 19)).toThrow(RangeError)
    expect(() => buildTargetCurve(Infinity, 22, 19)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, -22, 19)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, NaN, 19)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, Infinity, 19)).toThrow(RangeError)
  })

  it('throws a RangeError for fewer than 1 week or a part of a week', () => {
    expect(() => buildTargetCurve(10, 22, 0)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, 22, -3)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, 22, 19.5)).toThrow(RangeError)
    expect(() => buildTargetCurve(10, 22, NaN)).toThrow(RangeError)
  })

  it('throws a RangeError when the peak is below the start', () => {
    expect(() => buildTargetCurve(10, 8, 19)).toThrow(RangeError)
  })
})

describe('reachablePeak', () => {
  it('is about 22.8 from 8 miles over 15 weeks (11 up-steps of +10%)', () => {
    expect(reachablePeak(8, 15)).toBe(22.8)
  })

  it('is about 14.3 from 5 miles over 15 weeks', () => {
    expect(reachablePeak(5, 15)).toBe(14.3)
  })

  it('uses the minimum step when 10% is smaller than 0.5 mile', () => {
    expect(reachablePeak(2, 15)).toBe(8.1)
    expect(reachablePeak(0, 15)).toBe(5.5)
  })

  it('grows with more weeks and shrinks with fewer', () => {
    expect(reachablePeak(8, 10)).toBeLessThan(reachablePeak(8, 15))
    expect(reachablePeak(8, 15)).toBeLessThan(reachablePeak(8, 19))
  })

  it('counts only up-steps, so a recovery week adds no progress', () => {
    expect(reachablePeak(8, 1)).toBe(8)
    expect(reachablePeak(8, 4)).toBe(9.7)
    expect(reachablePeak(8, 5)).toBe(10.6)
    expect(reachablePeak(8, 16)).toBe(reachablePeak(8, 15))
  })

  it('uses the step size and recovery spacing from a custom config', () => {
    const config = { ...DEFAULT_CONFIG, normalStep: 0.05, recoveryEvery: 3 }
    expect(reachablePeak(10, 7, config)).toBe(12.2)
  })

  it('throws a RangeError for bad miles or fewer than 1 week', () => {
    expect(() => reachablePeak(-1, 15)).toThrow(RangeError)
    expect(() => reachablePeak(NaN, 15)).toThrow(RangeError)
    expect(() => reachablePeak(Infinity, 15)).toThrow(RangeError)
    expect(() => reachablePeak(8, 0)).toThrow(RangeError)
    expect(() => reachablePeak(8, 1.5)).toThrow(RangeError)
    expect(() => reachablePeak(8, NaN)).toThrow(RangeError)
  })
})

describe('reachableFrom', () => {
  it('matches reachablePeak when starting from week 1', () => {
    expect(reachableFrom(8, 1, 15)).toBe(22.8)
    expect(reachableFrom(5, 1, 15)).toBe(reachablePeak(5, 15))
  })

  it('counts only the steps between the two weeks', () => {
    expect(reachableFrom(10.5, 5, 15)).toBe(22.5)
  })

  it('returns the same miles when toWeek is not after fromWeek', () => {
    expect(reachableFrom(8, 5, 5)).toBe(8)
    expect(reachableFrom(8, 10, 5)).toBe(8)
  })

  it('treats a recovery fromWeek as the up week before it', () => {
    expect(reachableFrom(8, 4, 15)).toBe(reachableFrom(8, 3, 15))
  })

  it('uses the step size and recovery spacing from a custom config', () => {
    const config = { ...DEFAULT_CONFIG, normalStep: 0.05, recoveryEvery: 3 }
    expect(reachableFrom(10, 1, 7, config)).toBe(reachablePeak(10, 7, config))
  })

  it('throws a RangeError for bad miles or weeks', () => {
    expect(() => reachableFrom(-1, 1, 15)).toThrow(RangeError)
    expect(() => reachableFrom(NaN, 1, 15)).toThrow(RangeError)
    expect(() => reachableFrom(8, 0, 15)).toThrow(RangeError)
    expect(() => reachableFrom(8, 1, 1.5)).toThrow(RangeError)
  })
})
