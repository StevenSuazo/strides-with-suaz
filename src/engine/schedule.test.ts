import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { placeRuns as placeRunsWith } from './schedule'
import type { WeekAvailability, WeekTarget } from './types'

const normalWeek: WeekAvailability = [
  'morning',
  'morning',
  'morning',
  'morning',
  'open',
  'open',
  'open',
]
const testConfig = { ...DEFAULT_CONFIG, morningMaxMiles: 5, minRunMiles: 1 }
const placeRuns = (weekTarget: WeekTarget, availability: WeekAvailability) =>
  placeRunsWith(weekTarget, availability, testConfig)
const allOpen: WeekAvailability = Array(7).fill('open')
const oneEasyDay: WeekAvailability = [
  'open',
  'off',
  'off',
  'off',
  'open',
  'off',
  'off',
]
const target = (targetMiles: number, longRunMiles: number): WeekTarget => ({
  weekIndex: 1,
  targetMiles,
  longRunMiles,
})

describe('placeRuns', () => {
  it('places the long run on Friday in a normal week', () => {
    const { runs } = placeRuns(target(20, 8), normalWeek)
    const longRuns = runs.filter((run) => run.kind === 'long')
    expect(longRuns).toHaveLength(1)
    expect(longRuns[0].dayIndex).toBe(4)
    expect(longRuns[0].miles).toBe(8)
  })

  it('schedules at least 3 runs in a normal week', () => {
    const { runs } = placeRuns(target(20, 8), normalWeek)
    expect(runs.length).toBeGreaterThanOrEqual(3)
  })

  it('moves the long run to the open day with the most room when Friday is off', () => {
    const week: WeekAvailability = [
      'morning',
      'morning',
      'open',
      'morning',
      'off',
      'off',
      'open',
    ]
    const { runs } = placeRuns(target(20, 8), week)
    const longRun = runs.find((run) => run.kind === 'long')
    expect(longRun?.dayIndex).toBe(6)
  })

  it('breaks a tie by picking the open day closest to Friday, then the earlier one', () => {
    const week: WeekAvailability = [
      'open',
      'open',
      'open',
      'open',
      'off',
      'open',
      'open',
    ]
    const { runs } = placeRuns(target(20, 8), week)
    expect(runs.find((run) => run.kind === 'long')?.dayIndex).toBe(3)
  })
  it('treats a morning-only day as a normal run day with a length cap', () => {
    const { runs } = placeRuns(target(20, 8), normalWeek)
    const morningRuns = runs.filter((run) => run.dayIndex < 4)
    expect(morningRuns.length).toBeGreaterThan(0)
    morningRuns.forEach((run) => {
      expect(run.miles).toBeLessThanOrEqual(testConfig.morningMaxMiles)
    })
  })
  it('schedules 3 runs when they fit, and adds a 4th when 3 would be too long', () => {
    expect(placeRuns(target(20, 8), allOpen).runs).toHaveLength(3)
    expect(placeRuns(target(20, 2), allOpen).runs).toHaveLength(4)
  })
  it('keeps a rest day between runs where it can', () => {
    const { runs } = placeRuns(target(20, 8), normalWeek)
    const days = runs.map((run) => run.dayIndex).sort((a, b) => a - b)
    days.slice(1).forEach((day, i) => {
      expect(day - days[i]).toBeGreaterThan(1)
    })
  })

  it('still schedules 3 runs when a rest day cannot be kept', () => {
    const week: WeekAvailability = [
      'open',
      'open',
      'off',
      'off',
      'open',
      'off',
      'off',
    ]
    const { runs } = placeRuns(target(20, 8), week)
    expect(runs.map((run) => run.dayIndex).sort()).toEqual([0, 1, 4])
  })
  it('stretches runs when days are scarce, up to the cap', () => {
    const week: WeekAvailability = [
      'open',
      'off',
      'open',
      'off',
      'open',
      'off',
      'off',
    ]
    const { runs, shortByMiles } = placeRuns(target(24, 9), week)
    expect(runs).toHaveLength(3)
    expect(
      runs.filter((run) => run.kind === 'easy').map((run) => run.miles),
    ).toEqual([7.5, 7.5])
    expect(shortByMiles).toBe(0)
  })
  it('reports shortByMiles when the cap blocks the full mileage', () => {
    const { runs, shortByMiles } = placeRuns(target(20, 8), oneEasyDay)
    expect(runs.map((run) => run.miles)).toEqual([8, 8])
    expect(shortByMiles).toBe(4)
  })
  it('rounds a cap down, so no run passes it', () => {
    const { runs, shortByMiles } = placeRuns(target(13.7, 6), oneEasyDay)
    expect(runs.map((run) => run.miles)).toEqual([5.4, 6])
    expect(shortByMiles).toBe(2.3)
  })

  it('returns a plain-English note whenever a rule bends', () => {
    expect(placeRuns(target(20, 8), allOpen).notes).toEqual([])
    const short = placeRuns(target(20, 8), oneEasyDay).notes
    expect(short.some((note) => note.includes('4.0 miles short'))).toBe(true)
    const extra = placeRuns(target(20, 2), allOpen).notes
    expect(extra.some((note) => note.includes('4 runs'))).toBe(true)
  })
  it('handles a week with no open days', () => {
    const week: WeekAvailability = Array(7).fill('morning')
    const { runs, shortByMiles, notes } = placeRuns(target(20, 8), week)
    const longRun = runs.find((run) => run.kind === 'long')
    expect(longRun?.dayIndex).toBe(4)
    expect(longRun?.miles).toBe(testConfig.morningMaxMiles)
    expect(runs.reduce((sum, run) => sum + run.miles, 0)).toBe(20)
    expect(shortByMiles).toBe(0)
    expect(notes.some((note) => note.includes('long run'))).toBe(true)
  })

  it('handles a week with nothing to run on', () => {
    const week: WeekAvailability = Array(7).fill('off')
    const result = placeRuns(target(20, 8), week)
    expect(result.runs).toEqual([])
    expect(result.shortByMiles).toBe(20)
    expect(result.notes).toHaveLength(1)
  })

  it('handles a week with only two open days', () => {
    const apart: WeekAvailability = [
      'off',
      'off',
      'off',
      'off',
      'open',
      'off',
      'open',
    ]
    const result = placeRuns(target(12, 5), apart)
    expect(result.runs.map((run) => run.dayIndex)).toEqual([4, 6])
    expect(result.shortByMiles).toBe(2.2)
    expect(result.notes.some((note) => note.includes('Only 2 run days'))).toBe(
      true,
    )

    const together: WeekAvailability = [
      'off',
      'off',
      'off',
      'open',
      'open',
      'off',
      'off',
    ]
    const back = placeRuns(target(12, 5), together)
    expect(back.runs.map((run) => run.dayIndex)).toEqual([3, 4])
    expect(back.notes.some((note) => note.includes('back to back'))).toBe(true)
  })

  it('splits a small week into 3 runs when each is at least a mile', () => {
    const { runs, notes } = placeRuns(target(4, 2), normalWeek)
    expect(runs.map((run) => run.miles)).toEqual([1, 1, 2])
    expect(notes).toEqual([])
  })

  it('uses minRunMiles from the config', () => {
    const config = { ...DEFAULT_CONFIG, minRunMiles: 2 }
    const { runs } = placeRunsWith(target(4, 2), normalWeek, config)
    expect(runs.map((run) => run.miles)).toEqual([2, 2])
  })

  it('uses fewer runs when the target is too small to split', () => {
    const { runs, shortByMiles, notes } = placeRuns(target(3, 1.5), normalWeek)
    expect(runs.map((run) => run.miles)).toEqual([1.5, 1.5])
    expect(shortByMiles).toBe(0)
    expect(notes.some((note) => note.includes('target is small'))).toBe(true)
  })

  it('has run miles that add up to the target minus shortByMiles', () => {
    ;[20, 13.7].forEach((miles) => {
      const { runs, shortByMiles } = placeRuns(target(miles, 6), normalWeek)
      const total = runs.reduce((sum, run) => sum + run.miles, 0)
      expect(total).toBeCloseTo(miles - shortByMiles, 5)
    })
  })
})
