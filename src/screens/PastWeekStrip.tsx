/**
 * PastWeekStrip.tsx: the strip for a week that has already ended.
 *
 * Loads that week's saved availability and the hand matches from storage,
 * rebuilds the planned runs from the target the week had (a week with nothing
 * saved counts as all days open), matches them to your runs the way the
 * current week is matched, and draws the week strip. Shows "Loading…" until
 * storage answers and the reason if it fails. stripLabel names the strip for
 * screen readers (default "Week N"). Used by the calendar and the Home pager.
 */
import { useEffect, useState } from 'react'
import { placeRuns, weekStartDate } from '../engine'
import type {
  IsoDate,
  Run,
  WeekAvailability,
  WeekTarget,
} from '../engine/types'
import { raceWeekAvailability } from '../plan/raceWeek'
import { usePlanSettings } from '../plan/usePlanSettings'
import { matchWeek } from '../plan/weekMatch'
import { useStorage } from '../storage/useStorage'
import { WeekStrip } from './WeekStrip'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

type Loaded = {
  availability: WeekAvailability
  overrides: Record<string, string>
}

export const PastWeekStrip = ({
  weekIndex,
  target,
  runs,
  today,
  onOpenRun,
  stripLabel = `Week ${weekIndex}`,
}: {
  weekIndex: number
  target: WeekTarget
  runs: Run[]
  today: IsoDate
  onOpenRun?: (run: Run) => void
  stripLabel?: string
}) => {
  const storage = useStorage()
  const settings = usePlanSettings()
  const { startDate } = settings
  const [loaded, setLoaded] = useState<Loaded>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    Promise.all([storage.getAvailability(weekIndex), storage.getOverrides()])
      .then(([saved, overrides]) => {
        if (active) setLoaded({ availability: saved ?? ALL_OPEN, overrides })
      })
      .catch((caught: unknown) => {
        if (active)
          setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      active = false
    }
  }, [storage, weekIndex])

  if (error) return <p role="alert">{`Couldn't load this week: ${error}`}</p>
  if (!loaded) return <p className="muted">Loading…</p>

  const weekStart = weekStartDate(weekIndex, startDate)
  const { rows, extraRuns } = matchWeek({
    weekIndex,
    weekStart,
    planned: placeRuns(
      target,
      raceWeekAvailability(loaded.availability, weekIndex, settings),
    ).runs,
    runs,
    overrides: loaded.overrides,
    today,
  })
  return (
    <WeekStrip
      weekStart={weekStart}
      rows={rows}
      extraRuns={extraRuns}
      today={today}
      stripLabel={stripLabel}
      onOpenRun={onOpenRun}
    />
  )
}
