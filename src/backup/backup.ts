/**
 * backup.ts: gather everything stored into one plain object for a JSON file.
 *
 * Read-only. Availability is saved per week, so it is read for weeks
 * 1 to totalWeeks and kept under the week number. Restore is not built yet.
 */
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'
import type { AppStorage, Overrides } from '../storage/types'

export type Backup = {
  version: 1
  exportedAt: string
  weekResults: WeekResult[]
  gateState: GateState | null
  availability: Record<string, WeekAvailability>
  runs: Run[]
  checkIns: CheckIn[]
  overrides: Overrides
}

export const buildBackup = async (
  storage: AppStorage,
  exportedAt: string,
  totalWeeks: number,
): Promise<Backup> => {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const [weekResults, gateState, runs, checkIns, overrides, saved] =
    await Promise.all([
      storage.getWeekResults(),
      storage.getGateState(),
      storage.getRuns(),
      storage.getCheckIns(),
      storage.getOverrides(),
      Promise.all(weeks.map((week) => storage.getAvailability(week))),
    ])
  const availability: Record<string, WeekAvailability> = {}
  weeks.forEach((week, i) => {
    const found = saved[i]
    if (found) availability[String(week)] = found
  })
  return {
    version: 1,
    exportedAt,
    weekResults,
    gateState: gateState ?? null,
    availability,
    runs,
    checkIns,
    overrides,
  }
}

export const backupFilename = (today: string): string =>
  `strides-backup-${today}.json`

/** Hands the text to the browser as a file download. */
export const downloadText = (filename: string, text: string): void => {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
