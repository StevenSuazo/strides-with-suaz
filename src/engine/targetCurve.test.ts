import { describe, it } from 'vitest'

describe('buildTargetCurve', () => {
  it.todo('returns one target per week')
  it.todo(
    'makes weeks 4, 8, 12, and 16 recovery weeks at 75% of the last up week',
  )
  it.todo(
    'resumes from the week before a recovery week, not from the recovery week',
  )
  it.todo('reaches the peak in week 15 and repeats it in week 17')
  it.todo(
    'sets the taper (week 18) to 70% of peak and week 19 to race-week miles',
  )
  it.todo(
    'never rises more than 10% (or the minimum step) from one up week to the next',
  )
  it.todo('lowers the peak when the cap cannot reach it')
  it.todo('throws a RangeError for negative miles or fewer than 1 week')
})

describe('reachablePeak', () => {
  it.todo('is about 22.8 from 8 miles over 15 weeks (11 up-steps of +10%)')
  it.todo('is about 14.3 from 5 miles over 15 weeks')
  it.todo('grows with more weeks and shrinks with fewer')
})
