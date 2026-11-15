import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { matchRuns } from './matching'
import type { Run, Workout } from './types'

const workout = (id: string, date: string, miles: number): Workout => ({
  id,
  date,
  miles,
  kind: 'easy',
})
const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'strava',
})

describe('matchRuns', () => {
  it('matches a run to the workout on the same date', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3)],
      [run('r1', '2026-11-10', 3.1)],
    )
    expect(result.matched).toEqual([{ workoutId: 'w1', runId: 'r1' }])
  })
  it('picks the closest distance when two workouts are planned on one day', () => {
    const planned = [
      workout('w1', '2026-11-10', 3),
      workout('w2', '2026-11-10', 6),
    ]
    const runs = [run('r1', '2026-11-10', 5.8)]
    const result = matchRuns(planned, runs)
    expect(result.matched).toEqual([{ workoutId: 'w2', runId: 'r1' }])
    expect(result.missedWorkouts.map((w) => w.id)).toEqual(['w1'])
    expect(matchRuns([...planned].reverse(), runs).matched).toEqual(
      result.matched,
    )
  })

  it('picks the closest run when two runs fall on one workout date', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 6)],
      [run('r1', '2026-11-10', 3), run('r2', '2026-11-10', 5.9)],
    )
    expect(result.matched).toEqual([{ workoutId: 'w1', runId: 'r2' }])
    expect(result.unplannedRuns.map((r) => r.id)).toEqual(['r1'])
  })

  it('matches swapped days: a run one day off links to the unmatched workout', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3)],
      [run('r1', '2026-11-11', 3.2)],
    )
    expect(result.matched).toEqual([{ workoutId: 'w1', runId: 'r1' }])
    expect(result.unplannedRuns).toEqual([])
  })

  it('does not swap when the run is two days off or the distance is not similar', () => {
    const planned = [workout('w1', '2026-11-10', 3)]
    const twoDays = matchRuns(planned, [run('r1', '2026-11-12', 3)])
    expect(twoDays.matched).toEqual([])
    const farOff = matchRuns(planned, [run('r1', '2026-11-11', 6)])
    expect(farOff.matched).toEqual([])
    expect(farOff.missedWorkouts.map((w) => w.id)).toEqual(['w1'])
  })

  it('prefers a same-date match over a swap', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3), workout('w2', '2026-11-11', 3)],
      [run('r1', '2026-11-11', 3)],
    )
    expect(result.matched).toEqual([{ workoutId: 'w2', runId: 'r1' }])
    expect(result.missedWorkouts.map((w) => w.id)).toEqual(['w1'])
  })

  it('returns a run with nothing planned that day as an unplanned run', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3)],
      [run('r1', '2026-11-10', 3), run('r2', '2026-11-14', 4)],
    )
    expect(result.unplannedRuns.map((r) => r.id)).toEqual(['r2'])
    expect(result.matched).toEqual([{ workoutId: 'w1', runId: 'r1' }])
  })

  it('returns a skipped workout as a missed workout', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3), workout('w2', '2026-11-13', 3)],
      [run('r1', '2026-11-10', 3)],
    )
    expect(result.missedWorkouts.map((w) => w.id)).toEqual(['w2'])
  })

  it('lets a manual override beat the automatic match', () => {
    const planned = [
      workout('w1', '2026-11-10', 3),
      workout('w2', '2026-11-13', 3),
    ]
    const runs = [run('r1', '2026-11-10', 3)]
    const result = matchRuns(planned, runs, { r1: 'w2' })
    expect(result.matched).toEqual([{ workoutId: 'w2', runId: 'r1' }])
    expect(result.missedWorkouts.map((w) => w.id)).toEqual(['w1'])
  })

  it('ignores an override that points at something that does not exist', () => {
    const result = matchRuns(
      [workout('w1', '2026-11-10', 3)],
      [run('r1', '2026-11-10', 3)],
      { r1: 'nope', ghost: 'w1' },
    )
    expect(result.matched).toEqual([{ workoutId: 'w1', runId: 'r1' }])
  })

  it('links each run and each workout at most once', () => {
    const twoWorkouts = matchRuns(
      [workout('w1', '2026-11-10', 3), workout('w2', '2026-11-10', 3)],
      [run('r1', '2026-11-10', 3)],
    )
    expect(twoWorkouts.matched).toHaveLength(1)
    expect(twoWorkouts.missedWorkouts).toHaveLength(1)

    const twoRuns = matchRuns(
      [workout('w1', '2026-11-10', 3)],
      [run('r1', '2026-11-10', 3), run('r2', '2026-11-10', 3)],
    )
    expect(twoRuns.matched).toHaveLength(1)
    expect(twoRuns.unplannedRuns).toHaveLength(1)

    const chain = matchRuns(
      [workout('w1', '2026-11-10', 3), workout('w2', '2026-11-11', 3)],
      [run('r1', '2026-11-10', 3)],
    )
    expect(chain.matched).toEqual([{ workoutId: 'w1', runId: 'r1' }])
  })

  it('uses swapMatchShare from the config', () => {
    const planned = [workout('w1', '2026-11-10', 3)]
    const runs = [run('r1', '2026-11-11', 4)]
    expect(matchRuns(planned, runs).matched).toEqual([])
    const wide = { ...DEFAULT_CONFIG, swapMatchShare: 0.5 }
    expect(matchRuns(planned, runs, {}, wide).matched).toHaveLength(1)
  })

  it('keeps the input order in every list', () => {
    const planned = [
      workout('w1', '2026-11-10', 3),
      workout('w2', '2026-11-12', 3),
      workout('w3', '2026-11-14', 3),
    ]
    const runs = [run('r3', '2026-11-14', 3), run('r1', '2026-11-10', 3)]
    const result = matchRuns(planned, runs)
    expect(result.matched.map((m) => m.workoutId)).toEqual(['w1', 'w3'])
    expect(result.missedWorkouts.map((w) => w.id)).toEqual(['w2'])
  })

  it('returns empty lists for empty input', () => {
    expect(matchRuns([], [])).toEqual({
      matched: [],
      unplannedRuns: [],
      missedWorkouts: [],
    })
  })

  it('treats every run as unplanned when nothing is planned', () => {
    const result = matchRuns([], [run('r1', '2026-11-10', 3)])
    expect(result.unplannedRuns.map((r) => r.id)).toEqual(['r1'])
  })

  it('throws a RangeError for a bad date or negative miles', () => {
    const good = [workout('w1', '2026-11-10', 3)]
    expect(() => matchRuns(good, [run('r1', '2026-02-30', 3)])).toThrow(
      RangeError,
    )
    expect(() => matchRuns(good, [run('r1', 'tuesday', 3)])).toThrow(RangeError)
    expect(() => matchRuns(good, [run('r1', '2026-11-10', -1)])).toThrow(
      RangeError,
    )
    expect(() => matchRuns([workout('w1', '2026-11-10', NaN)], [])).toThrow(
      RangeError,
    )
  })
})
