import { describe, expect, it } from 'vitest'
import { projectedRows } from './projection'
import { PLAN } from './settings'

const target = { weekIndex: 3, targetMiles: 10.1, longRunMiles: 5 }

describe('projectedRows', () => {
  const rows = projectedRows(target, '2026-11-23')

  it('plans runs on days inside the week, all still upcoming', () => {
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.status).toBe('upcoming')
      expect(row.workout.date >= '2026-11-23').toBe(true)
      expect(row.workout.date <= '2026-11-29').toBe(true)
      expect(row.run).toBeUndefined()
    }
  })

  it('gives each run an id for its week and day', () => {
    for (const row of rows) {
      expect(row.workout.id).toBe(`w3-${row.dayIndex}`)
    }
  })

  it('includes the long run', () => {
    expect(rows.some((row) => row.workout.kind === 'long')).toBe(true)
  })

  it('puts each run on the date of its day', () => {
    const monday = rows.find((row) => row.dayIndex === 0)
    if (monday) expect(monday.workout.date).toBe('2026-11-23')
  })
})

describe('projectedRows: race week', () => {
  // Week 19 of the built-in plan starts Mon Mar 15, 2027.
  const raceWeek = { weekIndex: 19, targetMiles: 8, longRunMiles: 3 }
  const settings = { ...PLAN, raceDate: '2027-03-17' } // a Wednesday

  it('plans nothing on or after race day', () => {
    const rows = projectedRows(raceWeek, '2027-03-15', settings)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.dayIndex).toBeLessThan(2)
  })

  it('still fills the whole week when it is not race week', () => {
    const rows = projectedRows(
      { ...raceWeek, weekIndex: 18 },
      '2027-03-08',
      settings,
    )
    expect(rows.some((row) => row.dayIndex >= 2)).toBe(true)
  })
})
