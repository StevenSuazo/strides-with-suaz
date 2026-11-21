import { describe, expect, it } from 'vitest'
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'
import {
  availabilityToRow,
  checkInToRow,
  gateStateToRow,
  overrideToRow,
  rowToAvailability,
  rowToCheckIn,
  rowToGateState,
  rowToRun,
  rowToWeekResult,
  rowsToOverrides,
  runToRow,
  weekResultToRow,
} from './mapper'

const result: WeekResult = {
  weekIndex: 1,
  targetMiles: 8.5,
  actualMiles: 8.56,
  longRunMiles: 4.01,
  highestPain: 0,
}

const days: WeekAvailability = [
  'open',
  'off',
  'open',
  'off',
  'open',
  'off',
  'morning',
]

describe('week results', () => {
  it('writes snake_case columns and no user_id', () => {
    expect(weekResultToRow(result)).toEqual({
      week_index: 1,
      target_miles: 8.5,
      actual_miles: 8.56,
      long_run_miles: 4.01,
      highest_pain: 0,
    })
  })

  it('reads a row back into the engine shape', () => {
    expect(
      rowToWeekResult({ user_id: 'u1', ...weekResultToRow(result) }),
    ).toEqual(result)
  })
})

describe('gate state', () => {
  const state: GateState = {
    reducedMode: true,
    goodWeeksInRow: 1,
    lastLongRunMiles: 4.7,
  }

  it('writes a missing weekBeforeRecovery as null', () => {
    expect(gateStateToRow(state)).toEqual({
      reduced_mode: true,
      good_weeks_in_row: 1,
      last_long_run_miles: 4.7,
      week_before_recovery: null,
    })
  })

  it('reads null back as no weekBeforeRecovery at all', () => {
    const read = rowToGateState({ user_id: 'u1', ...gateStateToRow(state) })
    expect(read).toEqual(state)
    expect('weekBeforeRecovery' in read).toBe(false)
  })

  it('round-trips a nested weekBeforeRecovery', () => {
    const withRecovery = { ...state, weekBeforeRecovery: result }
    expect(
      rowToGateState({ user_id: 'u1', ...gateStateToRow(withRecovery) }),
    ).toEqual(withRecovery)
  })

  it('rejects a weekBeforeRecovery that is not a week result', () => {
    const row = { user_id: 'u1', ...gateStateToRow(state) }
    expect(() =>
      rowToGateState({ ...row, week_before_recovery: 'oops' }),
    ).toThrow()
    expect(() => rowToGateState({ ...row, week_before_recovery: [] })).toThrow()
    expect(() =>
      rowToGateState({
        ...row,
        week_before_recovery: { ...result, actualMiles: -1 },
      }),
    ).toThrow(RangeError)
  })
})

describe('availability', () => {
  it('writes the week and its days', () => {
    expect(availabilityToRow(3, days)).toEqual({ week_index: 3, days })
  })

  it('reads the days back', () => {
    expect(
      rowToAvailability({ user_id: 'u1', ...availabilityToRow(3, days) }),
    ).toEqual(days)
  })

  it('rejects a day the engine does not know', () => {
    expect(() =>
      rowToAvailability({
        user_id: 'u1',
        week_index: 3,
        days: [...days.slice(0, 6), 'busy'],
      }),
    ).toThrow(RangeError)
  })
})

describe('runs', () => {
  const run: Run = {
    id: 'r1',
    date: '2026-11-15',
    miles: 4.01,
    source: 'strava',
  }

  it('writes the columns', () => {
    expect(runToRow(run)).toEqual({
      id: 'r1',
      date: '2026-11-15',
      miles: 4.01,
      source: 'strava',
    })
  })

  it('round-trips both sources', () => {
    expect(rowToRun({ user_id: 'u1', ...runToRow(run) })).toEqual(run)
    const inApp: Run = { ...run, source: 'in_app' }
    expect(rowToRun({ user_id: 'u1', ...runToRow(inApp) })).toEqual(inApp)
  })

  it('writes missing details as null and reads null back as missing', () => {
    expect(runToRow(run)).toMatchObject({
      duration_seconds: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      cadence: null,
      effort: null,
    })
  })

  it('round-trips the optional details', () => {
    const detailed: Run = {
      ...run,
      durationSeconds: 2310,
      avgHeartRate: 152,
      maxHeartRate: 171,
      cadence: 168,
      effort: 6,
    }
    expect(runToRow(detailed)).toMatchObject({
      duration_seconds: 2310,
      avg_heart_rate: 152,
      max_heart_rate: 171,
      cadence: 168,
      effort: 6,
    })
    expect(rowToRun({ user_id: 'u1', ...runToRow(detailed) })).toEqual(detailed)
  })

  it('rejects a source the app does not know', () => {
    expect(() =>
      rowToRun({ user_id: 'u1', ...runToRow(run), source: 'garmin' }),
    ).toThrow('source')
  })
})

describe('check-ins', () => {
  const full: CheckIn = {
    id: 'c1',
    date: '2026-11-15',
    workoutId: 'w1',
    activityId: 'a1',
    feel: 'okay',
    entries: [
      { area: 'knee', side: 'left', pain: 2 },
      { area: 'other', side: 'na', pain: 1, otherLabel: 'toe' },
    ],
    note: 'felt fine',
    kind: 'nextMorning',
  }

  const bare: CheckIn = {
    id: 'c2',
    date: '2026-11-16',
    feel: 'good',
    entries: [],
    kind: 'afterRun',
  }

  it('writes snake_case columns and the entries as a list', () => {
    expect(checkInToRow(full)).toEqual({
      id: 'c1',
      date: '2026-11-15',
      workout_id: 'w1',
      activity_id: 'a1',
      feel: 'okay',
      kind: 'nextMorning',
      note: 'felt fine',
      entries: full.entries,
    })
  })

  it('writes missing optional fields as null', () => {
    const row = checkInToRow(bare)
    expect(row.workout_id).toBeNull()
    expect(row.activity_id).toBeNull()
    expect(row.note).toBeNull()
  })

  it('round-trips a check-in with every field', () => {
    expect(rowToCheckIn({ user_id: 'u1', ...checkInToRow(full) })).toEqual(full)
  })

  it('reads nulls back as missing fields, not as undefined keys', () => {
    const read = rowToCheckIn({ user_id: 'u1', ...checkInToRow(bare) })
    expect(read).toEqual(bare)
    expect(Object.keys(read).sort()).toEqual(Object.keys(bare).sort())
  })

  it('rejects an unknown feel or kind', () => {
    const row = { user_id: 'u1', ...checkInToRow(bare) }
    expect(() => rowToCheckIn({ ...row, feel: 'meh' })).toThrow('feel')
    expect(() => rowToCheckIn({ ...row, kind: 'later' })).toThrow('kind')
  })

  it('rejects entries that are not a list', () => {
    const row = { user_id: 'u1', ...checkInToRow(bare) }
    expect(() => rowToCheckIn({ ...row, entries: { area: 'knee' } })).toThrow(
      'entries',
    )
  })
})

describe('overrides', () => {
  it('writes a pairing', () => {
    expect(overrideToRow('run-1', 'workout-1')).toEqual({
      run_id: 'run-1',
      workout_id: 'workout-1',
    })
  })

  it('folds rows into a run id to workout id record', () => {
    expect(
      rowsToOverrides([
        { user_id: 'u1', run_id: 'run-1', workout_id: 'workout-1' },
        { user_id: 'u1', run_id: 'run-2', workout_id: 'workout-2' },
      ]),
    ).toEqual({ 'run-1': 'workout-1', 'run-2': 'workout-2' })
  })

  it('gives an empty record for no rows', () => {
    expect(rowsToOverrides([])).toEqual({})
  })
})
