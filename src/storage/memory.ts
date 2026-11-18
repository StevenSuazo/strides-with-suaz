/**
 * memory.ts: storage that lives in a variable.
 *
 * createMemoryStorage(): AppStorage
 * Used by tests and by demo mode, never to hold real data. Each call returns a
 * fresh, empty store. Records go in and come out as copies, and reads are
 * sorted, so it behaves the way the Supabase version will.
 */
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'
import type { AppStorage, Overrides } from './types'
import {
  checkAvailability,
  checkCheckIn,
  checkGateState,
  checkOverride,
  checkRun,
  checkWeekIndex,
  checkWeekResult,
} from './validate'

const copy = <T>(value: T): T => structuredClone(value)

const byDateThenId = (
  a: { date: string; id: string },
  b: { date: string; id: string },
): number => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)

export const createMemoryStorage: () => AppStorage = () => {
  const weekResults = new Map<number, WeekResult>()
  const availability = new Map<number, WeekAvailability>()
  const runs = new Map<string, Run>()
  const checkIns = new Map<string, CheckIn>()
  const overrides: Overrides = {}
  let gateState: GateState | undefined

  return {
    getWeekResults: async () =>
      copy([...weekResults.values()].sort((a, b) => a.weekIndex - b.weekIndex)),
    saveWeekResult: async (result) => {
      checkWeekResult(result)
      weekResults.set(result.weekIndex, copy(result))
    },

    getGateState: async () => (gateState ? copy(gateState) : undefined),
    saveGateState: async (state) => {
      checkGateState(state)
      gateState = copy(state)
    },

    getAvailability: async (weekIndex) => {
      checkWeekIndex(weekIndex)
      const saved = availability.get(weekIndex)
      return saved ? copy(saved) : undefined
    },
    saveAvailability: async (weekIndex, days) => {
      checkWeekIndex(weekIndex)
      checkAvailability(days)
      availability.set(weekIndex, copy(days))
    },

    getRuns: async () => copy([...runs.values()].sort(byDateThenId)),
    saveRun: async (run) => {
      checkRun(run)
      runs.set(run.id, copy(run))
    },
    deleteRun: async (id) => {
      runs.delete(id)
    },

    getCheckIns: async () => copy([...checkIns.values()].sort(byDateThenId)),
    saveCheckIn: async (checkIn) => {
      checkCheckIn(checkIn)
      checkIns.set(checkIn.id, copy(checkIn))
    },

    getOverrides: async () => copy(overrides),
    saveOverride: async (runId, workoutId) => {
      checkOverride(runId, workoutId)
      overrides[runId] = workoutId
    },
  }
}
