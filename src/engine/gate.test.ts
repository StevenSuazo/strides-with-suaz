import { describe, it } from 'vitest'

describe('gate: decisions', () => {
  it.todo(
    'advances: target 10, actual 10, low pain, curve next 12 gives next 11.0',
  )
  it.todo(
    'treats a ratio of exactly 0.90 as advance: target 10, actual 9 gives next 9.9',
  )
  it.todo('repeats between 0.80 and 0.90: target 10, actual 8.5 gives next 10')
  it.todo(
    'steps back under 0.80: target 10, actual 7 gives next 7.0 with reduced mode on',
  )
  it.todo(
    'steps back on pain over the threshold: target 10, actual 10, pain 4 gives next 7.0',
  )
  it.todo('does not step back for pain exactly at the threshold')
  it.todo(
    'uses the minimum step at low mileage: target 4, actual 4, curve next 6 gives 4.5',
  )
  it.todo('caps the advance at the curve target')
  it.todo('keeps the long run from growing in a pain step-back week')
})

describe('gate: reduced mode', () => {
  it.todo('uses +5% (minimum 0.25 mile) while reduced mode is on')
  it.todo('turns reduced mode off after two weeks in a row at or above 0.90')
  it.todo('resets the good-weeks counter after a week below 0.90')
})

describe('gate: recovery, taper, and race weeks', () => {
  it.todo('sets a recovery week to 75% of the last up week with no gate')
  it.todo('resumes from the week before a recovery week')
  it.todo('uses fixed fractions for the taper and race weeks')
})

describe('gate: reasons and bad input', () => {
  it.todo('always returns a plain-English reason')
  it.todo('throws a RangeError for negative or NaN miles')
  it.todo('throws a RangeError for pain outside 0 to 10')
  it.todo(
    'never gives a smaller next target for a bigger actual (ignoring recovery weeks)',
  )
})
