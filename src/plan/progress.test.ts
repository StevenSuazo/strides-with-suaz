import { describe, expect, it } from 'vitest'
import { buildTargetCurve, gate } from '../engine'
import type { CheckIn, GateState, Run, WeekResult } from '../engine/types'
import { computePlan } from './progress'
import { PLAN } from './settings'

const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})

const weekOneRuns = [
  run('seed-2026-11-09', '2026-11-09', 2.05),
  run('seed-2026-11-11', '2026-11-11', 2.5),
  run('seed-2026-11-15', '2026-11-15', 4.01),
]

const weekOne: WeekResult = {
  weekIndex: 1,
  targetMiles: 8.5,
  actualMiles: 8.56,
  longRunMiles: 4.01,
  highestPain: 0,
}

const plan = (
  today: string,
  runs: Run[] = weekOneRuns,
  savedResults: WeekResult[] = [weekOne],
  checkIns: CheckIn[] = [],
) => computePlan({ runs, checkIns, savedResults, today })

describe('computePlan: status and the first week', () => {
  it('is not started before the plan begins, and shows week 1 as the target', () => {
    const view = plan('2026-11-08', [], [])
    expect(view.status).toBe('notStarted')
    expect(view.target).toEqual({
      weekIndex: 1,
      targetMiles: 8.5,
      longRunMiles: 4,
    })
    expect(view.weeks).toEqual([])
  })

  it('is in progress during week 1 with no decision yet', () => {
    const view = plan('2026-11-11', weekOneRuns.slice(0, 2), [])
    expect(view.status).toBe('inProgress')
    expect(view.weekIndex).toBe(1)
    expect(view.target).toEqual({
      weekIndex: 1,
      targetMiles: 8.5,
      longRunMiles: 4,
    })
    expect(view.decision).toBeUndefined()
    expect(view.reason).toBeUndefined()
    expect(view.milesSoFar).toBe(4.55)
  })

  it('builds the curve from the plan settings', () => {
    const view = plan('2026-11-11', [], [])
    expect(view.curve).toEqual(
      buildTargetCurve(PLAN.startMiles, PLAN.peakMiles, PLAN.totalWeeks),
    )
    expect(view.curve).toHaveLength(19)
  })
})

describe('computePlan: your real week 1', () => {
  it('advances to week 2: 9.3 miles with a 4.7 long run', () => {
    const view = plan('2026-11-17')
    expect(view.status).toBe('inProgress')
    expect(view.weekIndex).toBe(2)
    expect(view.target).toEqual({
      weekIndex: 2,
      targetMiles: 9.3,
      longRunMiles: 4.7,
    })
    expect(view.decision).toBe('advance')
    expect(view.reason).toBeTruthy()
  })

  it('lists the ended week with the decision that followed it', () => {
    const view = plan('2026-11-17')
    expect(view.weeks).toHaveLength(1)
    expect(view.weeks[0].result).toEqual(weekOne)
    expect(view.weeks[0].gate?.decision).toBe('advance')
  })

  it('starts the new week at zero miles so far', () => {
    expect(plan('2026-11-17').milesSoFar).toBe(0)
  })

  it('counts miles so far for the current week only', () => {
    const runs = [...weekOneRuns, run('w2', '2026-11-17', 3.1)]
    expect(plan('2026-11-17', runs).milesSoFar).toBe(3.1)
  })

  it('says the goal is on track', () => {
    expect(plan('2026-11-17').goal.onTrack).toBe(true)
  })
})

describe('computePlan: the projected next week', () => {
  it('projects week 2 during week 1, as if week 1 hits its target', () => {
    const view = plan('2026-11-11', weekOneRuns.slice(0, 2), [])
    expect(view.projectedNext?.weekIndex).toBe(2)
    expect(view.projectedNext?.targetMiles).toBeGreaterThan(8.5)
    // It is only a projection: this week's real target is untouched.
    expect(view.target).toEqual({
      weekIndex: 1,
      targetMiles: 8.5,
      longRunMiles: 4,
    })
  })

  it('projects week 3 during week 2, building on the real week 1', () => {
    const view = plan('2026-11-17')
    expect(view.projectedNext?.weekIndex).toBe(3)
    expect(view.projectedNext?.targetMiles).toBeGreaterThan(
      view.target?.targetMiles ?? Infinity,
    )
  })

  it('does not depend on how much of this week has been run', () => {
    const none = plan('2026-11-17')
    const some = plan('2026-11-17', [...weekOneRuns, run('x', '2026-11-16', 3)])
    expect(some.projectedNext).toEqual(none.projectedNext)
  })

  it('has no projection before the plan starts or after it ends', () => {
    expect(plan('2026-11-08', [], []).projectedNext).toBeUndefined()
    expect(plan('2027-03-22').projectedNext).toBeUndefined()
  })

  it('has no projection in race week, the last one', () => {
    expect(plan('2027-03-21').projectedNext).toBeUndefined()
  })

  it('projects the race week during week 18', () => {
    expect(plan('2027-03-08').projectedNext?.weekIndex).toBe(19)
  })
})

describe('computePlan: what to save', () => {
  it('saves nothing when the saved week already matches', () => {
    expect(plan('2026-11-17').resultsToSave).toEqual([])
  })

  it('saves an ended week that was never saved', () => {
    expect(plan('2026-11-17', weekOneRuns, []).resultsToSave).toEqual([weekOne])
  })

  it('saves a week whose saved numbers are out of date', () => {
    const stale = { ...weekOne, actualMiles: 6 }
    expect(plan('2026-11-17', weekOneRuns, [stale]).resultsToSave).toEqual([
      weekOne,
    ])
  })

  it('does not trust a saved target: the derived one wins', () => {
    const wrongTarget = { ...weekOne, targetMiles: 99 }
    const view = plan('2026-11-17', weekOneRuns, [wrongTarget])
    expect(view.resultsToSave).toEqual([weekOne])
    expect(view.target?.targetMiles).toBe(9.3)
  })

  it('does not save the week in progress', () => {
    expect(plan('2026-11-11', weekOneRuns, []).resultsToSave).toEqual([])
  })
})

describe('computePlan: replaying the gate', () => {
  const fresh: GateState = {
    reducedMode: false,
    goodWeeksInRow: 0,
    lastLongRunMiles: 4,
  }

  it('matches running the gate by hand, week after week', () => {
    const week2Runs = [
      run('a', '2026-11-16', 3),
      run('b', '2026-11-18', 3),
      run('c', '2026-11-21', 3.3),
    ]
    const view = plan('2026-11-23', [...weekOneRuns, ...week2Runs], [])
    const curve = buildTargetCurve(8.5, 22, 19)
    const first = gate(weekOne, curve, fresh)
    const weekTwo: WeekResult = {
      weekIndex: 2,
      targetMiles: first.next.targetMiles,
      actualMiles: 9.3,
      longRunMiles: 3.3,
      highestPain: 0,
    }
    const second = gate(weekTwo, curve, first.state)
    expect(view.weekIndex).toBe(3)
    expect(view.target).toEqual(second.next)
    expect(view.reason).toBe(second.reason)
  })

  it('steps back after a week with no runs', () => {
    const view = plan('2026-11-17', [], [])
    expect(view.weeks[0].result.actualMiles).toBe(0)
    expect(view.decision).toBe('stepBack')
    expect(view.target!.targetMiles).toBeLessThan(8.5)
  })

  it('uses pain from check-ins when judging the week', () => {
    const painful: CheckIn = {
      id: 'c1',
      date: '2026-11-15',
      feel: 'rough',
      kind: 'afterRun',
      entries: [{ area: 'knee', side: 'left', pain: 8 }],
    }
    const view = plan('2026-11-17', weekOneRuns, [], [painful])
    expect(view.weeks[0].result.highestPain).toBe(8)
    expect(view.decision).toBe('stepBack')
  })

  it('carries an edit forward: more miles in week 1 lifts what follows', () => {
    const lower = plan('2026-11-17', weekOneRuns.slice(0, 2), [])
    const fuller = plan('2026-11-17', weekOneRuns, [])
    expect(fuller.target!.targetMiles).toBeGreaterThan(
      lower.target!.targetMiles,
    )
  })

  it('ignores runs from before the plan', () => {
    const view = plan('2026-11-17', [
      ...weekOneRuns,
      run('old', '2025-06-01', 12),
    ])
    expect(view.weeks[0].result).toEqual(weekOne)
  })
})

describe('computePlan: race week and after', () => {
  it('is in progress on race day, week 19, with the race target', () => {
    const view = plan('2027-03-21', [], [])
    expect(view.status).toBe('inProgress')
    expect(view.weekIndex).toBe(19)
    expect(view.target?.targetMiles).toBe(8)
  })

  it('is finished the day after, with every week listed and the last one not gated', () => {
    const view = plan('2027-03-22', [], [])
    expect(view.status).toBe('finished')
    expect(view.target).toBeUndefined()
    expect(view.weeks).toHaveLength(19)
    expect(view.weeks[17].gate).toBeDefined()
    expect(view.weeks[18].gate).toBeUndefined()
    expect(view.resultsToSave).toHaveLength(19)
  })
})

describe('computePlan: long after the race', () => {
  it('still lists exactly 19 weeks', () => {
    const view = plan('2027-06-01', [], [])
    expect(view.status).toBe('finished')
    expect(view.weeks).toHaveLength(19)
  })
})

describe('computePlan: bad input', () => {
  it('throws a RangeError for a date that does not exist', () => {
    expect(() => plan('2026-13-01')).toThrow(RangeError)
  })
})
