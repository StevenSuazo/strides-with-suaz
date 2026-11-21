import { describe, expect, it } from 'vitest'
import { projectedRows } from './projection'

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
