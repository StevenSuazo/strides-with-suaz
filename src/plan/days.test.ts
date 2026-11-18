import { describe, expect, it } from 'vitest'
import { assertDate, previousDay } from './days'

describe('previousDay', () => {
  it('steps back one day', () => {
    expect(previousDay('2026-11-16')).toBe('2026-11-15')
  })

  it('crosses a month and a year', () => {
    expect(previousDay('2026-12-01')).toBe('2026-11-30')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
  })

  it('knows leap years', () => {
    expect(previousDay('2028-03-01')).toBe('2028-02-29')
  })

  it('is not thrown off by the daylight-saving change', () => {
    expect(previousDay('2027-03-15')).toBe('2027-03-14')
    expect(previousDay('2027-03-14')).toBe('2027-03-13')
  })
})

describe('assertDate', () => {
  it('accepts a real date', () => {
    expect(() => assertDate('today', '2026-11-09')).not.toThrow()
  })

  it('rejects a date that does not exist, naming the field', () => {
    expect(() => assertDate('today', '2026-02-30')).toThrow(RangeError)
    expect(() => assertDate('today', '2026-02-30')).toThrow('today')
  })

  it('rejects text that is not YYYY-MM-DD', () => {
    expect(() => assertDate('today', 'Nov 9')).toThrow(RangeError)
    expect(() => assertDate('today', '2026-1-9')).toThrow(RangeError)
  })
})
