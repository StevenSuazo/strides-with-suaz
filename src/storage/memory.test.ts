import { describe, expect, it } from 'vitest'
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'
import { createMemoryStorage } from './memory'

const week = (weekIndex: number, overrides: Partial<WeekResult> = {}) => ({
  weekIndex,
  targetMiles: 8.5,
  actualMiles: 8.56,
  longRunMiles: 4,
  highestPain: 0,
  ...overrides,
})

const run = (id: string, date: string, overrides: Partial<Run> = {}): Run => ({
  id,
  date,
  miles: 4,
  source: 'in_app',
  ...overrides,
})

const checkIn = (
  id: string,
  date: string,
  overrides: Partial<CheckIn> = {},
): CheckIn => ({
  id,
  date,
  feel: 'good',
  entries: [{ area: 'knee', side: 'left', pain: 2 }],
  kind: 'afterRun',
  ...overrides,
})

const gateState = (overrides: Partial<GateState> = {}): GateState => ({
  reducedMode: false,
  goodWeeksInRow: 1,
  lastLongRunMiles: 4.7,
  ...overrides,
})

const openWeek: WeekAvailability = [
  'open',
  'off',
  'open',
  'off',
  'open',
  'off',
  'open',
]

describe('createMemoryStorage', () => {
  it('gives each storage its own data', async () => {
    const a = createMemoryStorage()
    const b = createMemoryStorage()
    await a.saveRun(run('r1', '2026-11-09'))
    expect(await b.getRuns()).toEqual([])
  })
})

describe('week results', () => {
  it('starts empty', async () => {
    expect(await createMemoryStorage().getWeekResults()).toEqual([])
  })

  it('saves a result and reads it back', async () => {
    const storage = createMemoryStorage()
    await storage.saveWeekResult(week(1))
    expect(await storage.getWeekResults()).toEqual([week(1)])
  })

  it('returns results sorted by weekIndex', async () => {
    const storage = createMemoryStorage()
    await storage.saveWeekResult(week(3))
    await storage.saveWeekResult(week(1))
    await storage.saveWeekResult(week(2))
    const saved = await storage.getWeekResults()
    expect(saved.map((result) => result.weekIndex)).toEqual([1, 2, 3])
  })

  it('replaces a result saved for the same week', async () => {
    const storage = createMemoryStorage()
    await storage.saveWeekResult(week(1, { actualMiles: 6 }))
    await storage.saveWeekResult(week(1, { actualMiles: 8.56 }))
    expect(await storage.getWeekResults()).toEqual([week(1)])
  })

  it('returns copies, so changing a read does not change the store', async () => {
    const storage = createMemoryStorage()
    await storage.saveWeekResult(week(1))
    const [first] = await storage.getWeekResults()
    first.actualMiles = 99
    expect(await storage.getWeekResults()).toEqual([week(1)])
  })

  it('stores a copy, so changing the saved object later does nothing', async () => {
    const storage = createMemoryStorage()
    const result = week(1)
    await storage.saveWeekResult(result)
    result.actualMiles = 99
    expect(await storage.getWeekResults()).toEqual([week(1)])
  })

  it('rejects a weekIndex that is not a whole number from 1', async () => {
    const storage = createMemoryStorage()
    await expect(storage.saveWeekResult(week(0))).rejects.toThrow(RangeError)
    await expect(storage.saveWeekResult(week(1.5))).rejects.toThrow(RangeError)
  })

  it('rejects negative or non-finite miles', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveWeekResult(week(1, { actualMiles: -1 })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveWeekResult(week(1, { targetMiles: NaN })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveWeekResult(week(1, { longRunMiles: Infinity })),
    ).rejects.toThrow(RangeError)
  })

  it('rejects pain outside 0 to 10 or not a whole number', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveWeekResult(week(1, { highestPain: 11 })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveWeekResult(week(1, { highestPain: 2.5 })),
    ).rejects.toThrow(RangeError)
  })

  it('stores nothing when a save is rejected', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveWeekResult(week(1, { actualMiles: -1 })),
    ).rejects.toThrow()
    expect(await storage.getWeekResults()).toEqual([])
  })

  it('accepts the edges: pain 0 and 10, zero miles', async () => {
    const storage = createMemoryStorage()
    await storage.saveWeekResult(
      week(1, { highestPain: 10, actualMiles: 0, longRunMiles: 0 }),
    )
    await storage.saveWeekResult(week(2, { highestPain: 0 }))
    expect(await storage.getWeekResults()).toHaveLength(2)
  })
})

describe('gate state', () => {
  it('is undefined before anything is saved', async () => {
    expect(await createMemoryStorage().getGateState()).toBeUndefined()
  })

  it('saves state and reads it back', async () => {
    const storage = createMemoryStorage()
    await storage.saveGateState(gateState())
    expect(await storage.getGateState()).toEqual(gateState())
  })

  it('replaces the earlier state', async () => {
    const storage = createMemoryStorage()
    await storage.saveGateState(gateState({ goodWeeksInRow: 1 }))
    await storage.saveGateState(gateState({ goodWeeksInRow: 2 }))
    expect((await storage.getGateState())?.goodWeeksInRow).toBe(2)
  })

  it('keeps the nested weekBeforeRecovery and copies it', async () => {
    const storage = createMemoryStorage()
    await storage.saveGateState(gateState({ weekBeforeRecovery: week(3) }))
    const read = await storage.getGateState()
    read!.weekBeforeRecovery!.actualMiles = 99
    expect((await storage.getGateState())?.weekBeforeRecovery).toEqual(week(3))
  })

  it('rejects a negative long run or a fractional good-weeks count', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveGateState(gateState({ lastLongRunMiles: -1 })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveGateState(gateState({ goodWeeksInRow: 1.5 })),
    ).rejects.toThrow(RangeError)
  })
})

describe('availability', () => {
  it('is undefined for a week that was never saved', async () => {
    expect(await createMemoryStorage().getAvailability(1)).toBeUndefined()
  })

  it('saves per week and keeps weeks apart', async () => {
    const storage = createMemoryStorage()
    const other: WeekAvailability = [
      'morning',
      'morning',
      'off',
      'off',
      'open',
      'off',
      'off',
    ]
    await storage.saveAvailability(1, openWeek)
    await storage.saveAvailability(2, other)
    expect(await storage.getAvailability(1)).toEqual(openWeek)
    expect(await storage.getAvailability(2)).toEqual(other)
  })

  it('replaces the availability for the same week', async () => {
    const storage = createMemoryStorage()
    await storage.saveAvailability(1, openWeek)
    const changed: WeekAvailability = [...openWeek]
    changed[1] = 'morning'
    await storage.saveAvailability(1, changed)
    expect(await storage.getAvailability(1)).toEqual(changed)
  })

  it('returns a copy', async () => {
    const storage = createMemoryStorage()
    await storage.saveAvailability(1, openWeek)
    const read = await storage.getAvailability(1)
    read![0] = 'off'
    expect(await storage.getAvailability(1)).toEqual(openWeek)
  })

  it('rejects a week that is not 7 days or has an unknown value', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveAvailability(1, openWeek.slice(0, 6)),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveAvailability(1, [...openWeek.slice(0, 6), 'busy' as 'open']),
    ).rejects.toThrow(RangeError)
  })

  it('rejects a bad weekIndex', async () => {
    const storage = createMemoryStorage()
    await expect(storage.saveAvailability(0, openWeek)).rejects.toThrow(
      RangeError,
    )
    await expect(storage.getAvailability(0)).rejects.toThrow(RangeError)
  })
})

describe('runs', () => {
  it('starts empty', async () => {
    expect(await createMemoryStorage().getRuns()).toEqual([])
  })

  it('saves a run and reads it back', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('r1', '2026-11-15', { miles: 4.01 }))
    expect(await storage.getRuns()).toEqual([
      run('r1', '2026-11-15', { miles: 4.01 }),
    ])
  })

  it('sorts by date, then by id', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('b', '2026-11-11'))
    await storage.saveRun(run('z', '2026-11-09'))
    await storage.saveRun(run('a', '2026-11-11'))
    const ids = (await storage.getRuns()).map((saved) => saved.id)
    expect(ids).toEqual(['z', 'a', 'b'])
  })

  it('replaces a run saved with the same id, so a re-sync adds no duplicate', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('r1', '2026-11-09', { miles: 2 }))
    await storage.saveRun(run('r1', '2026-11-09', { miles: 2.05 }))
    expect(await storage.getRuns()).toEqual([
      run('r1', '2026-11-09', { miles: 2.05 }),
    ])
  })

  it('returns copies', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('r1', '2026-11-09'))
    const [first] = await storage.getRuns()
    first.miles = 99
    expect((await storage.getRuns())[0].miles).toBe(4)
  })

  it('stores a copy of a saved run', async () => {
    const storage = createMemoryStorage()
    const saved = run('r1', '2026-11-09')
    await storage.saveRun(saved)
    saved.miles = 99
    expect((await storage.getRuns())[0].miles).toBe(4)
  })

  it('deletes a run and keeps the others', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('a', '2026-11-09'))
    await storage.saveRun(run('b', '2026-11-11'))
    await storage.deleteRun('a')
    expect((await storage.getRuns()).map((saved) => saved.id)).toEqual(['b'])
  })

  it('does nothing when deleting a run that is not there', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('a', '2026-11-09'))
    await storage.deleteRun('missing')
    expect(await storage.getRuns()).toHaveLength(1)
  })

  it('lets a deleted id be saved again', async () => {
    const storage = createMemoryStorage()
    await storage.saveRun(run('a', '2026-11-09', { miles: 2 }))
    await storage.deleteRun('a')
    await storage.saveRun(run('a', '2026-11-09', { miles: 3 }))
    expect(await storage.getRuns()).toEqual([
      run('a', '2026-11-09', { miles: 3 }),
    ])
  })

  it('rejects a date that does not exist', async () => {
    const storage = createMemoryStorage()
    await expect(storage.saveRun(run('r1', '2026-02-30'))).rejects.toThrow(
      RangeError,
    )
    await expect(storage.saveRun(run('r1', 'Nov 9'))).rejects.toThrow(
      RangeError,
    )
  })

  it('rejects negative or NaN miles', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveRun(run('r1', '2026-11-09', { miles: -0.1 })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveRun(run('r1', '2026-11-09', { miles: NaN })),
    ).rejects.toThrow(RangeError)
  })
})

describe('check-ins', () => {
  it('starts empty', async () => {
    expect(await createMemoryStorage().getCheckIns()).toEqual([])
  })

  it('saves a check-in and reads it back', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('c1', '2026-11-15', { note: 'fine' }))
    expect(await storage.getCheckIns()).toEqual([
      checkIn('c1', '2026-11-15', { note: 'fine' }),
    ])
  })

  it('sorts by date, then by id', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('b', '2026-11-12'))
    await storage.saveCheckIn(checkIn('c', '2026-11-10'))
    await storage.saveCheckIn(checkIn('a', '2026-11-12'))
    const ids = (await storage.getCheckIns()).map((saved) => saved.id)
    expect(ids).toEqual(['c', 'a', 'b'])
  })

  it('replaces a check-in with the same id', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('c1', '2026-11-15', { feel: 'okay' }))
    await storage.saveCheckIn(checkIn('c1', '2026-11-15', { feel: 'good' }))
    const saved = await storage.getCheckIns()
    expect(saved).toHaveLength(1)
    expect(saved[0].feel).toBe('good')
  })

  it('copies nested entries on the way in and out', async () => {
    const storage = createMemoryStorage()
    const original = checkIn('c1', '2026-11-15')
    await storage.saveCheckIn(original)
    original.entries[0].pain = 9
    const [read] = await storage.getCheckIns()
    expect(read.entries[0].pain).toBe(2)
    read.entries[0].pain = 8
    expect((await storage.getCheckIns())[0].entries[0].pain).toBe(2)
  })

  it('accepts a check-in with no pain entries', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('c1', '2026-11-15', { entries: [] }))
    expect(await storage.getCheckIns()).toHaveLength(1)
  })

  it('deletes a check-in and keeps the others', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('a', '2026-11-10'))
    await storage.saveCheckIn(checkIn('b', '2026-11-12'))
    await storage.deleteCheckIn('a')
    const ids = (await storage.getCheckIns()).map((saved) => saved.id)
    expect(ids).toEqual(['b'])
  })

  it('does nothing when deleting a check-in that is not there', async () => {
    const storage = createMemoryStorage()
    await storage.saveCheckIn(checkIn('a', '2026-11-10'))
    await storage.deleteCheckIn('missing')
    expect(await storage.getCheckIns()).toHaveLength(1)
  })

  it('rejects an entry pain outside 0 to 10 or fractional', async () => {
    const storage = createMemoryStorage()
    const entry = (pain: number) => [
      { area: 'knee' as const, side: 'left' as const, pain },
    ]
    await expect(
      storage.saveCheckIn(checkIn('c1', '2026-11-15', { entries: entry(11) })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveCheckIn(checkIn('c1', '2026-11-15', { entries: entry(-1) })),
    ).rejects.toThrow(RangeError)
    await expect(
      storage.saveCheckIn(checkIn('c1', '2026-11-15', { entries: entry(3.5) })),
    ).rejects.toThrow(RangeError)
  })

  it('rejects a date that does not exist', async () => {
    const storage = createMemoryStorage()
    await expect(
      storage.saveCheckIn(checkIn('c1', '2026-13-01')),
    ).rejects.toThrow(RangeError)
  })
})

describe('overrides', () => {
  it('starts as an empty object', async () => {
    expect(await createMemoryStorage().getOverrides()).toEqual({})
  })

  it('saves a pairing and reads it back', async () => {
    const storage = createMemoryStorage()
    await storage.saveOverride('run-1', 'workout-1')
    expect(await storage.getOverrides()).toEqual({ 'run-1': 'workout-1' })
  })

  it('replaces the workout for a run that is paired again', async () => {
    const storage = createMemoryStorage()
    await storage.saveOverride('run-1', 'workout-1')
    await storage.saveOverride('run-1', 'workout-2')
    expect(await storage.getOverrides()).toEqual({ 'run-1': 'workout-2' })
  })

  it('returns a copy', async () => {
    const storage = createMemoryStorage()
    await storage.saveOverride('run-1', 'workout-1')
    const read = await storage.getOverrides()
    read['run-2'] = 'workout-2'
    expect(await storage.getOverrides()).toEqual({ 'run-1': 'workout-1' })
  })

  it('rejects an empty id', async () => {
    const storage = createMemoryStorage()
    await expect(storage.saveOverride('', 'workout-1')).rejects.toThrow(
      RangeError,
    )
    await expect(storage.saveOverride('run-1', '')).rejects.toThrow(RangeError)
  })

  it('deletes an override', async () => {
    const storage = createMemoryStorage()
    await storage.saveOverride('run-1', 'workout-1')
    await storage.saveOverride('run-2', 'workout-2')
    await storage.deleteOverride('run-1')
    expect(await storage.getOverrides()).toEqual({ 'run-2': 'workout-2' })
  })

  it('does nothing when deleting a missing override', async () => {
    const storage = createMemoryStorage()
    await storage.deleteOverride('nope')
    expect(await storage.getOverrides()).toEqual({})
  })
})
