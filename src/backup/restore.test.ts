import { describe, expect, it } from 'vitest'
import type { CheckIn } from '../engine/types'
import { emptyStorage, seededStorage } from '../test/fixtures'
import { buildBackup } from './backup'
import { parseBackup, restoreBackup, summarizeBackup } from './restore'

const NOW = '2026-11-18T05:00:00.000Z'
const days = ['open', 'off', 'open', 'off', 'morning', 'off', 'open']
const checkIn: CheckIn = {
  id: 'c1',
  date: '2026-11-15',
  kind: 'afterRun',
  feel: 'good',
  entries: [{ area: 'knee', side: 'left', pain: 2 }],
  note: 'fine',
}

const fullStorage = async () => {
  const storage = await seededStorage()
  await storage.saveCheckIn(checkIn)
  await storage.saveOverride('seed-2026-11-11', 'w1-4')
  await storage.saveAvailability(2, days as never)
  await storage.saveGateState({
    reducedMode: false,
    goodWeeksInRow: 1,
    lastLongRunMiles: 4.01,
  })
  return storage
}
const fileOf = async () =>
  JSON.stringify(await buildBackup(await fullStorage(), NOW, 19))
const withChange = async (change: (b: Record<string, unknown>) => void) => {
  const backup = JSON.parse(await fileOf()) as Record<string, unknown>
  change(backup)
  return JSON.stringify(backup)
}

describe('parseBackup: good files', () => {
  it('reads back what buildBackup wrote', async () => {
    const backup = await buildBackup(await fullStorage(), NOW, 19)
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it('accepts an empty backup', async () => {
    const backup = await buildBackup(emptyStorage(), NOW, 19)
    expect(parseBackup(JSON.stringify(backup)).runs).toEqual([])
  })
})

describe('parseBackup: bad files', () => {
  const bad = (text: string, message: string | RegExp) =>
    expect(() => parseBackup(text)).toThrow(message)

  it('rejects text that is not JSON', () => {
    bad('hello', "That file isn't valid JSON.")
  })

  it('rejects JSON that is not a backup', () => {
    bad('[]', "That file isn't a Strides backup.")
    bad('null', "That file isn't a Strides backup.")
    bad('{"version":2}', "That file isn't a Strides backup.")
  })

  it('rejects missing or wrongly typed sections', async () => {
    bad(await withChange((b) => delete b.runs), /runs/)
    bad(await withChange((b) => (b.checkIns = 'x')), /checkIns/)
    bad(await withChange((b) => (b.overrides = [])), /overrides/)
    bad(await withChange((b) => (b.availability = null)), /availability/)
  })

  it('rejects a run with an out-of-range detail', async () => {
    bad(
      await withChange(
        (b) => ((b.runs as { effort: number }[])[0].effort = 11),
      ),
      /effort/,
    )
  })

  it('rejects a run with bad numbers, dates or source', async () => {
    bad(
      await withChange((b) => ((b.runs as { miles: number }[])[0].miles = -1)),
      /miles/,
    )
    bad(
      await withChange(
        (b) => ((b.runs as { date: string }[])[0].date = '2026-13-45'),
      ),
      /date/,
    )
    bad(
      await withChange(
        (b) => ((b.runs as { source: string }[])[0].source = 'garmin'),
      ),
      /run/,
    )
    bad(
      await withChange(
        (b) => ((b.runs as { miles: unknown }[])[0].miles = '2'),
      ),
      /run/,
    )
  })

  it('rejects a check-in with a bad feel, kind or pain', async () => {
    bad(
      await withChange(
        (b) => ((b.checkIns as { feel: string }[])[0].feel = 'great'),
      ),
      /check-in/,
    )
    bad(
      await withChange(
        (b) => ((b.checkIns as { kind: string }[])[0].kind = 'later'),
      ),
      /check-in/,
    )
    bad(
      await withChange(
        (b) =>
          ((
            b.checkIns as { entries: { pain: number }[] }[]
          )[0].entries[0].pain = 11),
      ),
      /pain/,
    )
  })

  it('rejects a bad week result, gate state, availability or override', async () => {
    bad(
      await withChange(
        (b) => ((b.weekResults as { weekIndex: number }[])[0].weekIndex = 0),
      ),
      /weekIndex/,
    )
    bad(
      await withChange(
        (b) =>
          ((b.gateState as { goodWeeksInRow: number }).goodWeeksInRow = -1),
      ),
      /goodWeeksInRow/,
    )
    bad(
      await withChange(
        (b) => ((b.availability as Record<string, unknown>)['2'] = ['open']),
      ),
      /7 days/,
    )
    bad(
      await withChange(
        (b) => ((b.availability as Record<string, unknown>)['abc'] = days),
      ),
      /availability/,
    )
    bad(
      await withChange(
        (b) => ((b.overrides as Record<string, unknown>)['seed-1'] = 5),
      ),
      /overrides/,
    )
  })
})

describe('summarizeBackup', () => {
  it('counts what is in the file', async () => {
    const backup = parseBackup(await fileOf())
    expect(summarizeBackup(backup)).toBe(
      '3 runs, 1 check-in, 1 week result, 1 week of availability, 1 hand match, and your plan progress',
    )
  })

  it('says nothing for an empty backup', async () => {
    const backup = await buildBackup(emptyStorage(), NOW, 19)
    expect(summarizeBackup(backup)).toBe('nothing')
  })
})

describe('restoreBackup', () => {
  it('restores everything into an empty account', async () => {
    const backup = await buildBackup(await fullStorage(), NOW, 19)
    const target = emptyStorage()
    await restoreBackup(target, backup)
    expect(await buildBackup(target, NOW, 19)).toEqual(backup)
  })

  it('merges: keeps what is already there and replaces matching ids', async () => {
    const backup = await buildBackup(await fullStorage(), NOW, 19)
    const target = emptyStorage()
    await target.saveRun({
      id: 'mine',
      date: '2026-11-16',
      miles: 3,
      source: 'in_app',
    })
    await target.saveRun({
      id: 'seed-2026-11-09',
      date: '2026-11-09',
      miles: 9,
      source: 'in_app',
    })
    await target.saveOverride('mine', 'w2-0')
    await restoreBackup(target, backup)
    const runs = await target.getRuns()
    expect(runs.map((r) => r.id).sort()).toEqual([
      'mine',
      'seed-2026-11-09',
      'seed-2026-11-11',
      'seed-2026-11-15',
    ])
    expect(runs.find((r) => r.id === 'seed-2026-11-09')?.miles).toBe(2.05)
    expect(await target.getOverrides()).toEqual({
      mine: 'w2-0',
      'seed-2026-11-11': 'w1-4',
    })
  })

  it('leaves existing plan progress alone when the file has none', async () => {
    const target = emptyStorage()
    const state = { reducedMode: true, goodWeeksInRow: 2, lastLongRunMiles: 6 }
    await target.saveGateState(state)
    await restoreBackup(target, await buildBackup(emptyStorage(), NOW, 19))
    expect(await target.getGateState()).toEqual(state)
  })
})
