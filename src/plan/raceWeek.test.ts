import { describe, expect, it } from 'vitest'
import type { WeekAvailability } from '../engine/types'
import { raceWeekAvailability } from './raceWeek'
import { PLAN, type PlanSettings } from './settings'

const open: WeekAvailability = Array(7).fill('open')
const withRace = (raceDate: string): PlanSettings => ({
  ...PLAN,
  startDate: '2026-11-09',
  raceDate,
  totalWeeks: 19,
})

describe('raceWeekAvailability', () => {
  it('leaves every other week alone', () => {
    expect(raceWeekAvailability(open, 18, withRace('2027-03-17'))).toEqual(open)
    expect(raceWeekAvailability(open, 1, withRace('2027-03-17'))).toEqual(open)
  })

  it('turns off race day and the days after it in race week', () => {
    // Sunday race: only Sunday goes.
    expect(raceWeekAvailability(open, 19, withRace('2027-03-21'))).toEqual([
      'open',
      'open',
      'open',
      'open',
      'open',
      'open',
      'off',
    ])
    // Saturday race: Saturday and Sunday.
    expect(raceWeekAvailability(open, 19, withRace('2027-03-20'))).toEqual([
      'open',
      'open',
      'open',
      'open',
      'open',
      'off',
      'off',
    ])
    // Wednesday race: Wednesday to Sunday.
    expect(raceWeekAvailability(open, 19, withRace('2027-03-17'))).toEqual([
      'open',
      'open',
      'off',
      'off',
      'off',
      'off',
      'off',
    ])
  })

  it('turns the whole week off for a Monday race', () => {
    expect(raceWeekAvailability(open, 19, withRace('2027-03-15'))).toEqual(
      Array(7).fill('off'),
    )
  })

  it('keeps morning-only days before race day as they are', () => {
    const mixed: WeekAvailability = [
      'morning',
      'open',
      'off',
      'morning',
      'open',
      'open',
      'open',
    ]
    expect(raceWeekAvailability(mixed, 19, withRace('2027-03-19'))).toEqual([
      'morning',
      'open',
      'off',
      'morning',
      'off',
      'off',
      'off',
    ])
  })

  it('does not change the availability it was given', () => {
    const before = [...open]
    raceWeekAvailability(open, 19, withRace('2027-03-17'))
    expect(open).toEqual(before)
  })
})
