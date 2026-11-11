import { describe, it } from 'vitest'

describe('placeRuns', () => {
  it.todo('places the long run on Friday in a normal week')
  it.todo(
    'moves the long run to the open day with the most room when Friday is off',
  )
  it.todo('treats a morning-only day as a normal run day with a length cap')
  it.todo('schedules at least 3 runs, and adds a 4th when 3 would be too long')
  it.todo('keeps a rest day between runs where it can')
  it.todo('stretches runs when days are scarce, up to the cap')
  it.todo('reports shortByMiles when the cap blocks the full mileage')
  it.todo('returns a plain-English note whenever a rule bends')
  it.todo('handles a week with no open days')
  it.todo('handles a week with only two open days')
  it.todo('handles a target too small to split sensibly')
  it.todo('has run miles that add up to the target minus shortByMiles')
})
