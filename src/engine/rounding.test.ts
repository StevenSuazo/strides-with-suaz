import { describe, expect, it } from 'vitest'
import { roundMiles } from './rounding'

describe('roundMiles', () => {
  it('rounds 4.04 down to 4.0', () => {
    expect(roundMiles(4.04)).toBe(4)
  })
  it('rounds 4.06 up to 4.1', () => {
    expect(roundMiles(4.06)).toBe(4.1)
  })
  it('returns 0 for 0', () => {
    expect(roundMiles(0)).toBe(0)
  })
  it('rounds an exact half up: 4.25 becomes 4.3', () => {
    expect(roundMiles(4.25)).toBe(4.3)
  })
  it('removes floating-point noise: 0.1 + 0.2 gives 0.3', () => {
    expect(roundMiles(0.1 + 0.2)).toBe(0.3)
  })
  it('throws a RangeError for NaN and Infinity', () => {
    expect(() => roundMiles(NaN)).toThrow(RangeError)
    expect(() => roundMiles(Infinity)).toThrow(RangeError)
    expect(() => roundMiles(-Infinity)).toThrow(RangeError)
  })
})
