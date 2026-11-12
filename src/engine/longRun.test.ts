import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { nextLongRun } from './longRun'

describe('nextLongRun', () => {
  it('adds 1 mile to the last long run when the week is long enough', () => {
    // cap is 20 * 0.5 = 10, so the +1 step (7) is the smaller number
    expect(nextLongRun(6, 20)).toBe(7)
  })

  it('never exceeds 50% of the week miles', () => {
    // +1 step would be 10, but the cap is 16 * 0.5 = 8
    expect(nextLongRun(9, 16)).toBe(8)
  })

  it('lets the cap win when it is below the last long run', () => {
    // Decision: on a short week the cap wins, even if that means the long run
    // shrinks. Cap is 12 * 0.5 = 6, last long run was 10, result is 6.
    expect(nextLongRun(10, 12)).toBe(6)
  })

  it('rounds to a tenth of a mile', () => {
    // 5.04 + 1 = 6.04, which rounds to 6
    expect(nextLongRun(5.04, 30)).toBe(6)
  })

  it('rounds the cap too', () => {
    // cap is 15.33 * 0.5 = 7.665, which rounds to 7.7 (last + 1 would be 9)
    expect(nextLongRun(8, 15.33)).toBe(7.7)
  })

  it('removes floating-point noise from the step', () => {
    // 0.1 + 1 is 1.1 exactly after rounding, not 1.1000000000000001
    expect(nextLongRun(0.1, 20)).toBe(1.1)
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
    // step: 6 + 2 = 8, cap: 30 * 0.4 = 12, so the step wins
    expect(nextLongRun(6, 30, config)).toBe(8)
    // step: 6 + 2 = 8, cap: 15 * 0.4 = 6, so the cap wins
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
