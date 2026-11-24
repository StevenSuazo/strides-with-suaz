/** fixtures.ts: your real week 1, shared by the screen and hook tests. */
import type { Run, WeekResult } from '../engine/types'
import { createMemoryStorage } from '../storage/memory'
import type { AppStorage } from '../storage/types'
import { PLAN, type PlanSettings } from '../plan/settings'

export const weekOneRuns: Run[] = [
  { id: 'seed-2026-11-09', date: '2026-11-09', miles: 2.05, source: 'in_app' },
  { id: 'seed-2026-11-11', date: '2026-11-11', miles: 2.5, source: 'in_app' },
  { id: 'seed-2026-11-15', date: '2026-11-15', miles: 4.01, source: 'in_app' },
]

export const weekOne: WeekResult = {
  weekIndex: 1,
  targetMiles: 8.5,
  actualMiles: 8.56,
  longRunMiles: 4.01,
  highestPain: 0,
}

export const emptyStorage = (): AppStorage => createMemoryStorage()

export const seededStorage = async (): Promise<AppStorage> => {
  const storage = createMemoryStorage()
  for (const run of weekOneRuns) await storage.saveRun(run)
  await storage.saveWeekResult(weekOne)
  return storage
}

/** A plan that starts a week after the built-in one (Mon Nov 16, race Sun Mar 28). */
export const laterPlan: PlanSettings = {
  ...PLAN,
  startDate: '2026-11-16',
  raceDate: '2027-03-28',
}
