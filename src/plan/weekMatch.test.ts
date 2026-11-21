import { describe, expect, it } from 'vitest'
import type { PlannedRun, Run } from '../engine/types'
import {
  UNMATCHED,
  matchWeek,
  overrideClears,
  overrideWrites,
} from './weekMatch'

const planned: PlannedRun[] = [
  { dayIndex: 0, kind: 'easy', miles: 2.3 },
  { dayIndex: 2, kind: 'easy', miles: 2.3 },
  { dayIndex: 4, kind: 'long', miles: 4.7 },
]
const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})
const base = {
  weekIndex: 2,
  weekStart: '2026-11-16',
  planned,
  runs: [] as Run[],
  overrides: {},
  today: '2026-11-17',
}

describe('matchWeek: workouts', () => {
  it('gives each planned run a stable id and its date', () => {
    const { rows } = matchWeek(base)
    expect(rows.map((r) => [r.workout.id, r.workout.date, r.dayIndex])).toEqual(
      [
        ['w2-0', '2026-11-16', 0],
        ['w2-2', '2026-11-18', 2],
        ['w2-4', '2026-11-20', 4],
      ],
    )
    expect(rows[2].workout.miles).toBe(4.7)
    expect(rows[2].workout.kind).toBe('long')
  })
})

describe('matchWeek: status', () => {
  it('is done, with the run, when a run is on the day', () => {
    const r = run('a', '2026-11-16', 2.5)
    const { rows } = matchWeek({ ...base, runs: [r] })
    expect(rows[0].status).toBe('done')
    expect(rows[0].run).toEqual(r)
  })

  it('is missed when the day has passed with no run', () => {
    expect(matchWeek(base).rows[0].status).toBe('missed')
  })

  it('is upcoming for today and later days', () => {
    const { rows } = matchWeek({ ...base, today: '2026-11-18' })
    expect(rows.map((r) => r.status)).toEqual([
      'missed',
      'upcoming',
      'upcoming',
    ])
  })

  it('takes a run one day off when it is close in miles', () => {
    const { rows } = matchWeek({ ...base, runs: [run('a', '2026-11-17', 2.4)] })
    expect(rows[0].status).toBe('done')
  })

  it('does not take a run one day off when it is far in miles', () => {
    const { rows, extraRuns } = matchWeek({
      ...base,
      runs: [run('a', '2026-11-17', 6)],
    })
    expect(rows[0].status).toBe('missed')
    expect(extraRuns.map((r) => r.id)).toEqual(['a'])
  })

  it('a manual match wins over the automatic one', () => {
    const r = run('a', '2026-11-16', 2.5)
    const { rows, extraRuns } = matchWeek({
      ...base,
      runs: [r],
      overrides: { a: 'w2-2' },
    })
    expect(rows[0].status).toBe('missed')
    expect(rows[1].status).toBe('done')
    expect(rows[1].run?.id).toBe('a')
    expect(extraRuns).toEqual([])
  })

  it('ignores an override that points at nothing', () => {
    const r = run('a', '2026-11-16', 2.5)
    const { rows } = matchWeek({
      ...base,
      runs: [r],
      overrides: { a: UNMATCHED },
    })
    expect(rows[0].status).toBe('done')
  })
})

describe('matchWeek: runs outside the plan', () => {
  it('lists runs on unplanned days as extra', () => {
    const { extraRuns } = matchWeek({
      ...base,
      runs: [run('a', '2026-11-21', 3)],
    })
    expect(extraRuns.map((r) => r.id)).toEqual(['a'])
  })

  it('ignores runs from other weeks', () => {
    const out = matchWeek({
      ...base,
      runs: [run('old', '2026-11-15', 4), run('next', '2026-11-23', 4)],
    })
    expect(out.weekRuns).toEqual([])
    expect(out.extraRuns).toEqual([])
  })

  it("returns this week's runs, oldest first", () => {
    const out = matchWeek({
      ...base,
      runs: [run('b', '2026-11-18', 2), run('a', '2026-11-16', 2)],
    })
    expect(out.weekRuns.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('has no rows when nothing is planned', () => {
    expect(matchWeek({ ...base, planned: [] }).rows).toEqual([])
  })
})

describe('overrideWrites', () => {
  it('just saves the new match when nothing clashes', () => {
    expect(overrideWrites({}, 'w2-2', 'a')).toEqual([['a', 'w2-2']])
  })

  it('frees a run that was manually matched to the same workout', () => {
    expect(overrideWrites({ old: 'w2-2' }, 'w2-2', 'a')).toEqual([
      ['old', UNMATCHED],
      ['a', 'w2-2'],
    ])
  })

  it('leaves other workouts and the same run alone', () => {
    expect(overrideWrites({ a: 'w2-0', other: 'w2-4' }, 'w2-2', 'a')).toEqual([
      ['a', 'w2-2'],
    ])
    expect(overrideWrites({ a: 'w2-2' }, 'w2-2', 'a')).toEqual([['a', 'w2-2']])
  })
})

describe('overrideClears', () => {
  const weekRuns = [run('a', '2026-11-16', 2), run('b', '2026-11-18', 2)]

  it('clears the run you let the app decide for', () => {
    expect(overrideClears({ a: 'w2-2' }, weekRuns, 'a')).toEqual(['a'])
  })

  it('also clears runs this week that were freed by a takeover', () => {
    expect(overrideClears({ a: 'w2-2', b: UNMATCHED }, weekRuns, 'a')).toEqual([
      'a',
      'b',
    ])
  })

  it('leaves other hand matches and other weeks alone', () => {
    expect(
      overrideClears({ a: 'w2-2', b: 'w2-4', far: UNMATCHED }, weekRuns, 'a'),
    ).toEqual(['a'])
  })

  it('skips a run that has no override', () => {
    expect(overrideClears({}, weekRuns, 'a')).toEqual([])
  })
})
