/**
 * restore.ts: read a backup file and put it back into storage.
 *
 * parseBackup(text): Backup. Checks the whole file first (JSON, version 1,
 * every record's shape and values, using the same checks as storage) and
 * throws an Error with a plain reason if anything is wrong, so a bad file
 * changes nothing.
 * summarizeBackup(backup): "3 runs, 1 check-in, and your plan progress".
 * restoreBackup(storage, backup): a merge. Everything in the file is saved
 * over what is stored (same id replaces, new ids are added). Nothing is ever
 * deleted, and if the file has no plan progress the stored progress is kept.
 */
import type { CheckIn, GateState, Run, WeekResult } from '../engine/types'
import type { AppStorage } from '../storage/types'
import {
  checkAvailability,
  checkCheckIn,
  checkGateState,
  checkOverride,
  checkRun,
  checkWeekIndex,
  checkWeekResult,
} from '../storage/validate'
import type { Backup } from './backup'

type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isStr = (value: unknown): value is string => typeof value === 'string'
const isOneOf = (value: unknown, options: string[]): boolean =>
  isStr(value) && options.includes(value)

const fail = (message: string): never => {
  throw new Error(message)
}

const list = (backup: Obj, name: string): unknown[] => {
  const value = backup[name]
  return Array.isArray(value) ? value : fail(`The "${name}" part is missing.`)
}

const weekResult = (value: unknown): WeekResult => {
  if (
    !isObj(value) ||
    !isNum(value.weekIndex) ||
    !isNum(value.targetMiles) ||
    !isNum(value.actualMiles) ||
    !isNum(value.longRunMiles) ||
    !isNum(value.highestPain)
  ) {
    fail('A week result in the file is malformed.')
  }
  const result = value as WeekResult
  checkWeekResult(result)
  return result
}

const gateState = (value: unknown): GateState | null => {
  if (value === null) return null
  if (
    !isObj(value) ||
    typeof value.reducedMode !== 'boolean' ||
    !isNum(value.goodWeeksInRow) ||
    !isNum(value.lastLongRunMiles)
  ) {
    fail('The plan progress in the file is malformed.')
  }
  const state = value as GateState
  if (state.weekBeforeRecovery !== undefined) {
    weekResult(state.weekBeforeRecovery)
  }
  checkGateState(state)
  return state
}

const run = (value: unknown): Run => {
  if (
    !isObj(value) ||
    !isStr(value.id) ||
    !isStr(value.date) ||
    !isNum(value.miles) ||
    !isOneOf(value.source, ['strava', 'in_app'])
  ) {
    fail('A run in the file is malformed.')
  }
  const found = value as Run
  checkRun(found)
  return found
}

const checkIn = (value: unknown): CheckIn => {
  if (
    !isObj(value) ||
    !isStr(value.id) ||
    !isStr(value.date) ||
    !isOneOf(value.feel, ['good', 'okay', 'rough']) ||
    !isOneOf(value.kind, ['afterRun', 'nextMorning']) ||
    !Array.isArray(value.entries) ||
    value.entries.some(
      (entry) =>
        !isObj(entry) ||
        !isStr(entry.area) ||
        !isStr(entry.side) ||
        !isNum(entry.pain),
    )
  ) {
    fail('A check-in in the file is malformed.')
  }
  const found = value as CheckIn
  checkCheckIn(found)
  return found
}

export const parseBackup = (text: string): Backup => {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail("That file isn't valid JSON.")
  }
  if (!isObj(raw) || raw.version !== 1) {
    return fail("That file isn't a Strides backup.")
  }

  const weekResults = list(raw, 'weekResults').map(weekResult)
  const runs = list(raw, 'runs').map(run)
  const checkIns = list(raw, 'checkIns').map(checkIn)

  const rawAvailability = raw.availability
  if (!isObj(rawAvailability)) fail('The "availability" part is missing.')
  const availability: Backup['availability'] = {}
  for (const [key, days] of Object.entries(rawAvailability as Obj)) {
    if (!/^\d+$/.test(key) || !Array.isArray(days)) {
      fail('The "availability" part is malformed.')
    }
    checkWeekIndex(Number(key))
    checkAvailability(days as Backup['availability'][string])
    availability[key] = days as Backup['availability'][string]
  }

  const rawOverrides = raw.overrides
  if (!isObj(rawOverrides)) fail('The "overrides" part is missing.')
  const overrides: Backup['overrides'] = {}
  for (const [runId, workout] of Object.entries(rawOverrides as Obj)) {
    if (!isStr(workout)) fail('The "overrides" part is malformed.')
    checkOverride(runId, workout as string)
    overrides[runId] = workout as string
  }

  return {
    version: 1,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
    weekResults,
    gateState: gateState(raw.gateState ?? null),
    availability,
    runs,
    checkIns,
    overrides,
  }
}

const count = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

export const summarizeBackup = (backup: Backup): string => {
  const parts = [
    backup.runs.length > 0 && count(backup.runs.length, 'run', 'runs'),
    backup.checkIns.length > 0 &&
      count(backup.checkIns.length, 'check-in', 'check-ins'),
    backup.weekResults.length > 0 &&
      count(backup.weekResults.length, 'week result', 'week results'),
    Object.keys(backup.availability).length > 0 &&
      `${count(Object.keys(backup.availability).length, 'week', 'weeks')} of availability`,
    Object.keys(backup.overrides).length > 0 &&
      count(Object.keys(backup.overrides).length, 'hand match', 'hand matches'),
  ].filter((part): part is string => part !== false)
  if (backup.gateState) parts.push('your plan progress')
  if (parts.length === 0) return 'nothing'
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

export const restoreBackup = async (
  storage: AppStorage,
  backup: Backup,
): Promise<void> => {
  for (const result of backup.weekResults) await storage.saveWeekResult(result)
  if (backup.gateState) await storage.saveGateState(backup.gateState)
  for (const [week, days] of Object.entries(backup.availability)) {
    await storage.saveAvailability(Number(week), days)
  }
  for (const found of backup.runs) await storage.saveRun(found)
  for (const found of backup.checkIns) await storage.saveCheckIn(found)
  for (const [runId, workout] of Object.entries(backup.overrides)) {
    await storage.saveOverride(runId, workout)
  }
}
