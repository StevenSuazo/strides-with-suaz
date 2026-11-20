import { describe, expect, it } from 'vitest'
import { formatDate, formatMiles } from './format'

describe('formatDate', () => {
  it('shows the weekday, month and day', () => {
    expect(formatDate('2026-11-15')).toBe('Sun, Nov 15')
    expect(formatDate('2026-11-16')).toBe('Mon, Nov 16')
  })

  it('does not pad the day', () => {
    expect(formatDate('2026-11-01')).toBe('Sun, Nov 1')
    expect(formatDate('2027-03-07')).toBe('Sun, Mar 7')
  })

  it('works across a month and year boundary', () => {
    expect(formatDate('2026-12-31')).toBe('Thu, Dec 31')
    expect(formatDate('2027-01-01')).toBe('Fri, Jan 1')
  })

  it('is not shifted by daylight saving', () => {
    expect(formatDate('2027-03-14')).toBe('Sun, Mar 14')
    expect(formatDate('2027-03-15')).toBe('Mon, Mar 15')
  })

  it('names the race day', () => {
    expect(formatDate('2027-03-21')).toBe('Sun, Mar 21')
  })
})

describe('formatMiles', () => {
  it('drops trailing zeros and rounds to hundredths', () => {
    expect(formatMiles(2.5)).toBe('2.5')
    expect(formatMiles(4.01)).toBe('4.01')
    expect(formatMiles(8.5600001)).toBe('8.56')
  })
})
