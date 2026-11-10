import { describe, it } from 'vitest'

describe('weekIndexForDate', () => {
  it.todo('puts Nov 9, 2026 (the plan start) in week 1')
  it.todo('puts Sunday, Nov 15 in week 1 and Monday, Nov 16 in week 2')
  it.todo('puts race day, March 21, 2027, in week 19')
  it.todo('behaves as decided for a date before the start or after week 19')
  it.todo('is correct across the March 14, 2027 daylight-saving change')
})

describe('weekStartDate', () => {
  it.todo('returns the plan start for week 1')
  it.todo('returns 2027-03-15 for week 19')
  it.todo('always returns a Monday')
})

describe('daysUntilRace', () => {
  it.todo('returns 131 from 2026-11-10 to 2027-03-21')
  it.todo('returns 0 on race day')
})
