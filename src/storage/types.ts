/**
 * types.ts: the one storage interface the app talks to.
 *
 * Every method is async because the Supabase version is. The in-memory
 * version (tests and demo mode) and the Supabase version must behave the same:
 * - Saving an id or weekIndex that already exists replaces the old record.
 * - Reads return copies, sorted: weeks by weekIndex, runs and check-ins by
 *   date then id.
 * - Bad data (negative miles, a pain outside 0 to 10, a date that does not
 *   exist) throws a RangeError and stores nothing.
 *
 * Planned workouts are not stored. They are regenerated from the target curve
 * and that week's saved availability, so availability is stored per week.
 */
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'

export type Overrides = Record<string, string> // run id to workout id

export type AppStorage = {
  getWeekResults: () => Promise<WeekResult[]>
  saveWeekResult: (result: WeekResult) => Promise<void>

  getGateState: () => Promise<GateState | undefined>
  saveGateState: (state: GateState) => Promise<void>

  getAvailability: (weekIndex: number) => Promise<WeekAvailability | undefined>
  saveAvailability: (
    weekIndex: number,
    availability: WeekAvailability,
  ) => Promise<void>

  getRuns: () => Promise<Run[]>
  saveRun: (run: Run) => Promise<void>
  deleteRun: (id: string) => Promise<void> // a missing id does nothing

  getCheckIns: () => Promise<CheckIn[]>
  saveCheckIn: (checkIn: CheckIn) => Promise<void>
  deleteCheckIn: (id: string) => Promise<void> // a missing id does nothing

  getOverrides: () => Promise<Overrides>
  saveOverride: (runId: string, workoutId: string) => Promise<void>
}
