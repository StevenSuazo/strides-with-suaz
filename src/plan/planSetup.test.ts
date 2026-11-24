import { describe, expect, it } from 'vitest'
import { checkPlanSetup } from '../storage/validate'
import {
  mondayOnOrAfter,
  readPlanDraft,
  weekdayName,
  type PlanDraft,
} from './planSetup'

const draft = (change: Partial<PlanDraft> = {}): PlanDraft => ({
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  startMiles: '8.5',
  peakMiles: '22',
  startLongRunMiles: '4',
  ...change,
})

describe('mondayOnOrAfter', () => {
  it('keeps a Monday and moves any other day forward to the next one', () => {
    expect(mondayOnOrAfter('2026-11-23')).toBe('2026-11-23') // Monday
    expect(mondayOnOrAfter('2026-11-24')).toBe('2026-11-30') // Tuesday
    expect(mondayOnOrAfter('2026-11-29')).toBe('2026-11-30') // Sunday
  })

  it('crosses a month and a year end', () => {
    expect(mondayOnOrAfter('2026-12-30')).toBe('2027-01-04')
  })
})

describe('readPlanDraft', () => {
  it('turns a valid draft into numbers and dates', () => {
    expect(readPlanDraft(draft())).toEqual({
      setup: {
        startDate: '2026-11-09',
        raceDate: '2027-03-21',
        startMiles: 8.5,
        peakMiles: 22,
        startLongRunMiles: 4,
      },
    })
  })

  it('allows a race on any day of the week', () => {
    for (const raceDate of ['2027-03-15', '2027-03-17', '2027-03-20']) {
      expect('setup' in readPlanDraft(draft({ raceDate }))).toBe(true)
    }
  })

  it('is just incomplete, with no complaint, while a box is still empty', () => {
    expect(readPlanDraft(draft({ raceDate: '' }))).toEqual({})
    expect(readPlanDraft(draft({ peakMiles: '' }))).toEqual({})
    expect(readPlanDraft(draft({ startMiles: '  ' }))).toEqual({})
  })

  it.each([
    ['a start that is not a Monday', { startDate: '2026-11-10' }, /Monday/],
    [
      'a race less than 8 weeks out',
      { raceDate: '2026-12-27' },
      /at least 8 weeks/,
    ],
    ['a race before the start', { raceDate: '2026-11-08' }, /after the start/],
    ['a date that does not exist', { startDate: '2026-02-30' }, /real date/],
    ['zero starting miles', { startMiles: '0' }, /Starting miles/],
    ['starting miles that are not a number', { startMiles: 'abc' }, /Starting/],
    ['a peak at the start', { peakMiles: '8.5' }, /Peak miles/],
    ['zero starting long run', { startLongRunMiles: '0' }, /long run/i],
  ])('explains %s', (_name, change, message) => {
    const read = readPlanDraft(draft(change))
    expect('setup' in read).toBe(false)
    expect((read as { problem?: string }).problem).toMatch(message)
  })

  it('agrees with the storage checks on whether a plan is allowed', () => {
    const cases: Partial<PlanDraft>[] = [
      {},
      { startDate: '2026-11-10' },
      { raceDate: '2027-03-20' },
      { raceDate: '2026-12-27' },
      { raceDate: '2026-12-28' },
      { raceDate: '2026-11-08' },
      { startMiles: '0' },
      { peakMiles: '8' },
      { startLongRunMiles: '-1' },
      { startDate: '2026-11-16', raceDate: '2026-11-22' },
    ]
    for (const change of cases) {
      const read = readPlanDraft(draft(change))
      let storageAllows = true
      try {
        if ('setup' in read) checkPlanSetup(read.setup)
        else storageAllows = false
      } catch {
        storageAllows = false
      }
      expect('setup' in read, JSON.stringify(change)).toBe(storageAllows)
    }
  })
})

describe('weekdayName', () => {
  it('names the day of the week of a date', () => {
    expect(weekdayName('2027-03-21')).toBe('Sunday')
    expect(weekdayName('2027-03-20')).toBe('Saturday')
    expect(weekdayName('2026-11-09')).toBe('Monday')
  })
})
