import { describe, expect, it } from 'vitest'
import { PLAN, planFromSetup, totalWeeksBetween } from './settings'

describe('totalWeeksBetween', () => {
  it('counts the whole weeks from a Monday start to a Sunday race', () => {
    expect(totalWeeksBetween('2026-11-09', '2027-03-21')).toBe(19)
    expect(totalWeeksBetween('2026-11-09', '2026-11-15')).toBe(1)
  })
})

describe('planFromSetup', () => {
  it('adds the derived week count and keeps the rest', () => {
    const setup = {
      startDate: '2026-11-09',
      raceDate: '2027-03-21',
      startMiles: 8.5,
      peakMiles: 22,
      startLongRunMiles: 4,
    }
    expect(planFromSetup(setup)).toEqual({ ...setup, totalWeeks: 19 })
  })

  it('matches the built-in plan', () => {
    const { totalWeeks, ...setup } = PLAN
    expect(planFromSetup(setup).totalWeeks).toBe(totalWeeks)
  })
})
