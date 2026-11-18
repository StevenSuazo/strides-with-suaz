import { describe, expect, it } from 'vitest'
import { todayIso } from './today'

describe('todayIso', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 10, 18, 9, 30))).toBe('2026-11-18')
  })

  it('pads single-digit months and days', () => {
    expect(todayIso(new Date(2027, 0, 5, 12, 0))).toBe('2027-01-05')
  })

  it('stays on the local day just before midnight', () => {
    expect(todayIso(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
  })

  it('stays on the local day just after midnight', () => {
    expect(todayIso(new Date(2027, 0, 1, 0, 0, 1))).toBe('2027-01-01')
  })

  it('uses the real clock when given nothing', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
