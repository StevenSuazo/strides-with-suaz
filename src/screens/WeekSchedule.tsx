/**
 * WeekSchedule.tsx: "Planned runs" for the week in progress, plus the
 * availability editor that drives it.
 *
 * Shows the week strip, then the summary you pass in, then the planned runs.
 * Before the plan starts or after it ends only the summary is shown. Availability is
 * saved per week; a week with nothing saved starts with every day open.
 * Saving re-plans the week on screen. Planned runs show done, missed or coming
 * up against the runs you logged, and can be re-paired by hand. It does not change the gate, which
 * only looks at miles and pain.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { placeRuns, weekStartDate } from '../engine'
import type { IsoDate, Run, WeekAvailability } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { PLAN } from '../plan/settings'
import { matchWeek, overrideWrites } from '../plan/weekMatch'
import { useStorage } from '../storage/useStorage'
import { AvailabilityEditor } from './AvailabilityEditor'
import { PlannedWeek } from './PlannedWeek'
import { WeekStrip } from './WeekStrip'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

export const WeekSchedule = ({
  view,
  runs,
  today,
  summary,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  summary: ReactNode
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

  // The {false} slots keep the summary in the same position in every state, so
  // it is not rebuilt when the strip and planned runs appear around it.
  if (weekIndex === undefined || !view.target)
    return (
      <>
        {false}
        {summary}
        {false}
      </>
    )
  if (error) {
    return (
      <>
        {false}
        {summary}
        <p role="alert">{`Couldn't load availability: ${error}`}</p>
      </>
    )
  }
  if (!loaded || loaded.weekIndex !== weekIndex) {
    return (
      <>
        {false}
        {summary}
        {false}
      </>
    )
  }

  const weekStart = weekStartDate(weekIndex, PLAN.startDate)
  const week = matchWeek({
    weekIndex,
    weekStart,
    planned: placeRuns(view.target, loaded.availability).runs,
    runs,
    overrides: loaded.overrides,
    today,
  })

  const save = async (availability: WeekAvailability) => {
    await storage.saveAvailability(weekIndex, availability)
    setLoaded((current) => current && { ...current, availability })
  }

  const match = async (workoutId: string, runId: string) => {
    const writes = overrideWrites(loaded.overrides, workoutId, runId)
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
        weekStart={weekStart}
        rows={week.rows}
        extraRuns={week.extraRuns}
        today={today}
      />
      {summary}
      <section className="card">
        <h2>Planned runs</h2>
        <PlannedWeek
          target={view.target}
          availability={loaded.availability}
          weekStart={weekStart}
          today={today}
          runs={runs}
          overrides={loaded.overrides}
          onMatch={match}
        />
        <details>
          <summary>Edit availability</summary>
          <AvailabilityEditor
            key={loaded.weekIndex}
            value={loaded.availability}
            onSave={save}
          />
        </details>
      </section>
    </>
  )
}
