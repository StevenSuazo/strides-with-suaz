import { describe, it } from 'vitest'

describe('matchRuns', () => {
  it.todo('matches a run to the workout on the same date')
  it.todo('picks the closest distance when two workouts are planned on one day')
  it.todo(
    'matches swapped days: a run one day off links to the unmatched workout',
  )
  it.todo('returns a run with nothing planned that day as an unplanned run')
  it.todo('returns a skipped workout as a missed workout')
  it.todo('lets a manual override beat the automatic match')
  it.todo('links each run and each workout at most once')
  it.todo('returns empty lists for empty input')
})
