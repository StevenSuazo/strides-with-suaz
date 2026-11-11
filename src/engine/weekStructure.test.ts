import { describe, expect, it } from 'vitest'
import { getWeekKind, isRecoveryWeek } from './weekStructure'
import { DEFAULT_CONFIG } from './config'

describe('isRecoveryWeek', () => {
  it('is true for weeks 4, 8, 12, and 16', () => {
    for (const week of [4, 8, 12, 16]) {
      expect(isRecoveryWeek(week)).toBe(true)
    }
  })
  it('is false for the weeks in between', () => {
    for (const week of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19]) {
      expect(isRecoveryWeek(week)).toBe(false)
    }
  })
  it('respects a different recoveryEvery from config', () => {
    const everyThird = { ...DEFAULT_CONFIG, recoveryEvery: 3 }
    expect(isRecoveryWeek(3, everyThird)).toBe(true)
    expect(isRecoveryWeek(6, everyThird)).toBe(true)
    expect(isRecoveryWeek(4, everyThird)).toBe(false)
  })
})

describe('getWeekKind (19-week plan)', () => {
  it('calls weeks 1 to 3 build', () => {
    for (const week of [1, 2, 3]) {
      expect(getWeekKind(week, 19)).toBe('build')
    }
  })
  it('calls weeks 4, 8, 12, and 16 recovery', () => {
    for (const week of [4, 8, 12, 16]) {
      expect(getWeekKind(week, 19)).toBe('recovery')
    }
  })
  it('calls weeks 15 and 17 peak', () => {
    expect(getWeekKind(15, 19)).toBe('peak')
    expect(getWeekKind(17, 19)).toBe('peak')
  })
  it('calls week 19 the race week', () => {
    expect(getWeekKind(19, 19)).toBe('race')
  })
  it('calls week 18 the taper week', () => {
    expect(getWeekKind(18, 19)).toBe('taper')
  })
  it('still works for a shorter plan, such as 12 weeks', () => {
    expect(getWeekKind(12, 12)).toBe('race')
    expect(getWeekKind(11, 12)).toBe('taper')
    expect(getWeekKind(10, 12)).toBe('peak')
    expect(getWeekKind(9, 12)).toBe('peak')
    expect(getWeekKind(8, 12)).toBe('recovery')
    expect(getWeekKind(4, 12)).toBe('recovery')
    expect(getWeekKind(5, 12)).toBe('build')
  })
  it('throws a RangeError for a weekIndex outside 1 to totalWeeks', () => {
    expect(() => getWeekKind(0, 19)).toThrow(RangeError)
    expect(() => getWeekKind(20, 19)).toThrow(RangeError)
  })
})
