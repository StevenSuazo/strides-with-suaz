import { describe, expect, it } from 'vitest'
import { computePlan } from './progress'
import { targetForWeek } from './pastWeeks'
import { weekOneRuns } from '../test/fixtures'

const view = computePlan({
  runs: weekOneRuns,
  checkIns: [],
  savedResults: [],
  today: '2026-11-17',
})

describe('targetForWeek', () => {
  it('gives week 1 the starting numbers', () => {
    expect(targetForWeek(view, 1)).toEqual({
      weekIndex: 1,
      targetMiles: view.curve[0],
      longRunMiles: 4,
    })
  })

  it('gives week 2 the target the gate set after week 1', () => {
    expect(targetForWeek(view, 2)).toEqual(view.target)
  })

  it('is undefined for a week that is not settled yet', () => {
    expect(targetForWeek(view, 3)).toBeUndefined()
  })
})
