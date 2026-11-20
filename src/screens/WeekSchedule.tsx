/**
 * WeekSchedule.tsx: "Planned runs" for the week in progress, plus the
 * availability editor that drives it.
 *
 * Shows the week strip, today's workout, then the summary you pass in, then the
 * planned runs.
 * Before the plan starts or after it ends only the summary is shown. Availability is
 * saved per week; a week with nothing saved starts with every day open.
 * Saving re-plans the week on screen. Planned runs show done, missed or coming
 * up against the runs you logged, and can be re-paired by hand. It does not change the gate, which
 * only looks at miles and pain.
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { placeRuns, weekStartDate } from '../engine'
import type { IsoDate, Run, RunKind, WeekAvailability } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { PLAN } from '../plan/settings'
import { matchWeek, overrideWrites } from '../plan/weekMatch'
import { useStorage } from '../storage/useStorage'
import { AvailabilityEditor } from './AvailabilityEditor'
import { PlannedWeek } from './PlannedWeek'
import { TodayCard } from './TodayCard'
import { WeekStrip } from './WeekStrip'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')
const NO_KINDS: Record<string, RunKind> = {}

export const WeekSchedule = ({
  view,
  runs,
  today,
  summary,
  onMatchedKinds,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  summary: ReactNode
  onMatchedKinds: (kinds: Record<string, RunKind>) => void
}) => {
  const storage = useStorage()
  const weekIndex = view.status === 'inProgress' ? view.weekIndex : undefined
  const [loaded, setLoaded] = useState<
    | {
        weekIndex: number
        availability: WeekAvailability
        overrides: Record<string, string>
      }
    | undefined
  >()
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (weekIndex === undefined) return
    let active = true
    Promise.all([storage.getAvailability(weekIndex), storage.getOverrides()])
      .then(([saved, overrides]) => {
        if (active) {
          setLoaded({ weekIndex, availability: saved ?? ALL_OPEN, overrides })
        }
      })
      .catch((caught: unknown) => {
        if (active)
          setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      active = false
    }
  }, [storage, weekIndex])

  const ready = loaded && loaded.weekIndex === weekIndex ? loaded : undefined
  const week = useMemo(() => {
    if (weekIndex === undefined || !view.target || !ready) return undefined
    const weekStart = weekStartDate(weekIndex, PLAN.startDate)
    return {
      weekStart,
      ...matchWeek({
        weekIndex,
        weekStart,
        planned: placeRuns(view.target, ready.availability).runs,
        runs,
        overrides: ready.overrides,
        today,
      }),
    }
  }, [weekIndex, view.target, ready, runs, today])

  // Tell the parent which logged runs this week matched, and the planned type
  // of each, so the run list can use the same easy/long colours as the strip.
  // A layout effect, so the list is corrected before the screen is painted.
  const matchedKinds = useMemo(
    () =>
      week
        ? Object.fromEntries(
            week.rows.flatMap((row) =>
              row.run ? [[row.run.id, row.workout.kind] as const] : [],
            ),
          )
        : NO_KINDS,
    [week],
  )
  useLayoutEffect(() => {
    onMatchedKinds(matchedKinds)
  }, [matchedKinds, onMatchedKinds])

  // The {false} slots keep the summary in the same position in every state, so
  // it is not rebuilt when the strip, today card and planned runs appear around it.
  if (weekIndex === undefined || !view.target)
    return (
      <>
        {false}
        {false}
        {summary}
        {false}
      </>
    )
  if (error) {
    return (
      <>
        {false}
        {false}
        {summary}
        <p role="alert">{`Couldn't load availability: ${error}`}</p>
      </>
    )
  }
  if (!ready || !week) {
    return (
      <>
        {false}
        {false}
        {summary}
        {false}
      </>
    )
  }

  const save = async (availability: WeekAvailability) => {
    await storage.saveAvailability(weekIndex, availability)
    setLoaded((current) => current && { ...current, availability })
  }

  const match = async (workoutId: string, runId: string) => {
    const writes = overrideWrites(ready.overrides, workoutId, runId)
    for (const [id, workout] of writes) await storage.saveOverride(id, workout)
    setLoaded(
      (current) =>
        current && {
          ...current,
          overrides: { ...current.overrides, ...Object.fromEntries(writes) },
        },
    )
  }

  return (
    <>
      <WeekStrip
        weekStart={week.weekStart}
        rows={week.rows}
        extraRuns={week.extraRuns}
        today={today}
      />
      <TodayCard
        weekStart={week.weekStart}
        rows={week.rows}
        extraRuns={week.extraRuns}
        today={today}
      />
      {summary}
      <section className="card">
        <h2>Planned runs</h2>
        <PlannedWeek
          target={view.target}
          availability={ready.availability}
          weekStart={week.weekStart}
          today={today}
          runs={runs}
          overrides={ready.overrides}
          onMatch={match}
        />
        <details>
          <summary>Edit availability</summary>
          <AvailabilityEditor
            key={ready.weekIndex}
            value={ready.availability}
            onSave={save}
          />
        </details>
      </section>
    </>
  )
}
