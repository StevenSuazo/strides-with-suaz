import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { nextLongRun } from './longRun'

describe('nextLongRun', () => {
  it('adds 1 mile to the last long run when the week is long enough', () => {
    expect(nextLongRun(6, 20)).toBe(7)
  })

  it('never exceeds 50% of the week miles', () => {
    expect(nextLongRun(9, 16)).toBe(8)
  })

  it('lets the cap win when it is below the last long run', () => {
    expect(nextLongRun(10, 12)).toBe(6)
  })

  it('rounds to a tenth of a mile', () => {
    expect(nextLongRun(5.04, 30)).toBe(6)
  })

  it('rounds the cap too', () => {
    expect(nextLongRun(8, 15.33)).toBe(7.7)
  })

  it('removes floating-point noise from the step', () => {
    const config = { ...DEFAULT_CONFIG, longRunStepMiles: 0.2 }
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(nextLongRun(0.1, 20, config)).toBe(0.3)
  })

  it('starts from 0 when there is no last long run', () => {
    expect(nextLongRun(0, 10)).toBe(1)
  })

  it('returns 0 when the week has no miles', () => {
    expect(nextLongRun(5, 0)).toBe(0)
  })

  it('uses the step and share from a custom config', () => {
    const config = {
      ...DEFAULT_CONFIG,
      longRunStepMiles: 2,
      longRunMaxShare: 0.4,
    }
    expect(nextLongRun(6, 30, config)).toBe(8)
    expect(nextLongRun(6, 15, config)).toBe(6)
  })

  it('throws a RangeError for negative, NaN, or Infinity miles', () => {
    expect(() => nextLongRun(-1, 20)).toThrow(RangeError)
    expect(() => nextLongRun(6, -20)).toThrow(RangeError)
    expect(() => nextLongRun(NaN, 20)).toThrow(RangeError)
    expect(() => nextLongRun(6, NaN)).toThrow(RangeError)
    expect(() => nextLongRun(Infinity, 20)).toThrow(RangeError)
    expect(() => nextLongRun(6, Infinity)).toThrow(RangeError)
  })
})
