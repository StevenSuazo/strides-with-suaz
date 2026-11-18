import { describe, expect, it } from 'vitest'
import { seededStorage, emptyStorage } from '../test/fixtures'
import { buildBackup, backupFilename } from './backup'

const NOW = '2026-11-18T05:00:00.000Z'
const week: ('open' | 'morning' | 'off')[] = [
  'open',
  'off',
  'open',
  'off',
  'morning',
  'off',
  'open',
]

describe('buildBackup', () => {
  it('has a version and the time it was made', async () => {
    const backup = await buildBackup(emptyStorage(), NOW, 19)
    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe(NOW)
  })

  it('is empty but well formed for a new account', async () => {
    const backup = await buildBackup(emptyStorage(), NOW, 19)
    expect(backup.runs).toEqual([])
    expect(backup.checkIns).toEqual([])
    expect(backup.weekResults).toEqual([])
    expect(backup.availability).toEqual({})
    expect(backup.overrides).toEqual({})
    expect(backup.gateState).toBeNull()
  })

  it('includes runs, week results, check-ins and overrides', async () => {
    const storage = await seededStorage()
    await storage.saveCheckIn({
      id: 'c1',
      date: '2026-11-15',
      kind: 'afterRun',
      feel: 'good',
      entries: [],
    })
    await storage.saveOverride('seed-2026-11-11', 'w-1')
    const backup = await buildBackup(storage, NOW, 19)
    expect(backup.runs.length).toBe(3)
    expect(backup.weekResults.length).toBe(1)
    expect(backup.weekResults[0].actualMiles).toBe(8.56)
    expect(backup.checkIns.length).toBe(1)
    expect(backup.overrides).toEqual({ 'seed-2026-11-11': 'w-1' })
  })

  it('includes the saved gate state', async () => {
    const storage = emptyStorage()
    const state = { reducedMode: true, goodWeeksInRow: 1, lastLongRunMiles: 5 }
    await storage.saveGateState(state)
    expect((await buildBackup(storage, NOW, 19)).gateState).toEqual(state)
  })

  it('collects availability for each saved week, keyed by week number', async () => {
    const storage = emptyStorage()
    await storage.saveAvailability(2, week)
    await storage.saveAvailability(19, week)
    const backup = await buildBackup(storage, NOW, 19)
    expect(Object.keys(backup.availability).sort()).toEqual(['19', '2'])
    expect(backup.availability['2']).toEqual(week)
  })

  it('ignores availability outside the plan weeks', async () => {
    const storage = emptyStorage()
    await storage.saveAvailability(20, week)
    expect((await buildBackup(storage, NOW, 19)).availability).toEqual({})
  })

  it('survives a trip through JSON', async () => {
    const backup = await buildBackup(await seededStorage(), NOW, 19)
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup)
  })
})

describe('backupFilename', () => {
  it('uses the local date', () => {
    expect(backupFilename('2026-11-18')).toBe('strides-backup-2026-11-18.json')
  })
})
