import { describe, it } from 'vitest'

describe('isRecoveryWeek', () => {
  it.todo('is true for weeks 4, 8, 12, and 16')
  it.todo('is false for the weeks in between')
  it.todo('respects a different recoveryEvery from config')
})

describe('getWeekKind (19-week plan)', () => {
  it.todo('calls weeks 1 to 3 build')
  it.todo('calls weeks 4, 8, 12, and 16 recovery')
  it.todo('calls weeks 15 and 17 peak')
  it.todo('calls week 18 taper and week 19 race')
  it.todo('still works for a shorter plan, such as 12 weeks')
  it.todo('throws a RangeError for a weekIndex outside 1 to totalWeeks')
})
