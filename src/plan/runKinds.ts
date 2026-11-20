/**
 * runKinds.ts: guess whether each logged run was an easy run or the long run.
 *
 * Weeks run Monday to Sunday, counted from the plan start (days before the
 * start fall in earlier 7-day blocks). The longest run of each week is the
 * long run, the same rule the weekly gate uses; the rest are easy. A tie goes
 * to the earlier run. This week's runs that match a planned workout use the
 * planned type instead; that is done by the caller.
 */
import type { IsoDate, Run, RunKind } from '../engine/types'

const MS_PER_DAY = 86_400_000

const dayNumber = (date: IsoDate): number => {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

export const runKinds = (
  runs: Run[],
  planStart: IsoDate,
): Record<string, RunKind> => {
  const longest = new Map<number, Run>()
  const weekOf = (run: Run): number =>
    Math.floor((dayNumber(run.date) - dayNumber(planStart)) / 7)

  for (const run of runs) {
    const week = weekOf(run)
    const best = longest.get(week)
    const beats =
      !best ||
      run.miles > best.miles ||
      (run.miles === best.miles &&
        (run.date.localeCompare(best.date) || run.id.localeCompare(best.id)) <
          0)
    if (beats) longest.set(week, run)
  }

  return Object.fromEntries(
    runs.map((run): [string, RunKind] => [
      run.id,
      longest.get(weekOf(run))?.id === run.id ? 'long' : 'easy',
    ]),
  )
}
