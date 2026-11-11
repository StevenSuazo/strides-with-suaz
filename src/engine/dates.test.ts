import { describe, expect, it } from 'vitest'
import { daysUntilRace, weekIndexForDate, weekStartDate } from './dates'

describe('weekIndexForDate', () => {
  it('puts Nov 9, 2026 (the plan start) in week 1', () => {
    expect(weekIndexForDate('2026-11-09', '2026-11-09')).toBe(1)
  })
  it('puts Sunday, Nov 15 in week 1 and Monday, Nov 16 in week 2', () => {
    expect(weekIndexForDate('2026-11-15', '2026-11-09')).toBe(1)
    expect(weekIndexForDate('2026-11-16', '2026-11-09')).toBe(2)
  })
  it('puts race day, March 21, 2027, in week 19', () => {
    expect(weekIndexForDate('2027-03-21', '2026-11-09')).toBe(19)
  })
  it('is correct across the March 14, 2027 daylight-saving change', () => {
    expect(weekIndexForDate('2027-03-14', '2026-11-09')).toBe(18)
    expect(weekIndexForDate('2027-03-15', '2026-11-09')).toBe(19)
  })
  it('throws a RangeError for a date before the plan start', () => {
    expect(() => weekIndexForDate('2026-11-08', '2026-11-09')).toThrow(
      RangeError,
    )
  })
})

describe('weekStartDate', () => {
  it('returns the plan start for week 1', () => {
    expect(weekStartDate(1, '2026-11-09')).toBe('2026-11-09')
  })
  it('returns 2027-03-15 for week 19', () => {
    expect(weekStartDate(19, '2026-11-09')).toBe('2027-03-15')
  })
  it('always returns a Monday', () => {
    for (let week = 1; week <= 19; week++) {
      const start = weekStartDate(week, '2026-11-09')
      expect(new Date(`${start}T00:00:00Z`).getUTCDay()).toBe(1)
    }
  })
  it('throws a RangeError for a week number below 1', () => {
    expect(() => weekStartDate(0, '2026-11-09')).toThrow(RangeError)
  })
})

describe('daysUntilRace', () => {
  it('returns 131 from 2026-11-10 to 2027-03-21', () => {
    expect(daysUntilRace('2026-11-10', '2027-03-21')).toBe(131)
  })
  it('returns 0 on race day', () => {
    expect(daysUntilRace('2027-03-21', '2027-03-21')).toBe(0)
  })
  it('counts whole days across the March 14, 2027 daylight-saving change', () => {
    expect(daysUntilRace('2027-03-13', '2027-03-15')).toBe(2)
  })
})
