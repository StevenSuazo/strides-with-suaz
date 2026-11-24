/**
 * useWeekSchedule.ts: loads and holds the week in progress for the tabs.
 *
 * useWeekSchedule(view, runs, today): { schedule, kinds, refresh }
 * - schedule.status is 'none' before the plan starts or after it ends,
 *   'loading' while this week's saved availability and hand matches load,
 *   'error' with a message if they cannot, or 'ready' with the week: its
 *   target, Monday, availability, hand matches (overrides), the planned rows
 *   matched against your runs, extra runs, and the runs dated that week. A
 *   ready schedule also has save (availability), match (pair a run with a
 *   workout) and unmatch (let the app decide again), which write to storage
 *   and update the screen.
 * - kinds maps each logged run matched to this week's plan to its planned
 *   type (easy or long), so the run list can use the same colours.
 * - refresh() reloads availability and matches, e.g. after a restore.
 * Availability is saved per week; a week with nothing saved starts all open.
 * It lives in the dashboard so it keeps its state while you change tabs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { placeRuns, weekStartDate } from '../engine'
import type {
  IsoDate,
  Run,
  RunKind,
  WeekAvailability,
  WeekTarget,
} from '../engine/types'
import type { PlanView } from '../plan/progress'
import { usePlanSettings } from '../plan/usePlanSettings'
import {
  matchWeek,
  overrideClears,
  overrideWrites,
  type PlannedRow,
} from '../plan/weekMatch'
import { useStorage } from '../storage/useStorage'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')
const NO_KINDS: Record<string, RunKind> = {}

export type WeekSchedule =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      weekIndex: number
      target: WeekTarget
      weekStart: IsoDate
      availability: WeekAvailability
      overrides: Record<string, string>
      rows: PlannedRow[]
      extraRuns: Run[]
      weekRuns: Run[]
      save: (availability: WeekAvailability) => Promise<void>
      match: (workoutId: string, runId: string) => Promise<void>
      unmatch: (runId: string) => Promise<void>
    }

type Loaded = {
  weekIndex: number
  availability: WeekAvailability
  overrides: Record<string, string>
}

export const useWeekSchedule = (
  view: PlanView,
  runs: Run[],
  today: IsoDate,
): {
  schedule: WeekSchedule
  kinds: Record<string, RunKind>
  refresh: () => void
} => {
  const storage = useStorage()
  const { startDate } = usePlanSettings()
  const weekIndex = view.status === 'inProgress' ? view.weekIndex : undefined
  const [loaded, setLoaded] = useState<Loaded | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [version, setVersion] = useState(0)

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
  }, [storage, weekIndex, version])

  const refresh = useCallback(() => setVersion((current) => current + 1), [])

  const ready = loaded && loaded.weekIndex === weekIndex ? loaded : undefined
  const week = useMemo(() => {
    if (weekIndex === undefined || !view.target || !ready) return undefined
    const weekStart = weekStartDate(weekIndex, startDate)
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
  }, [weekIndex, startDate, view.target, ready, runs, today])

  const kinds = useMemo(
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

  if (weekIndex === undefined || !view.target) {
    return { schedule: { status: 'none' }, kinds, refresh }
  }
  if (error) {
    return { schedule: { status: 'error', message: error }, kinds, refresh }
  }
  if (!ready || !week) {
    return { schedule: { status: 'loading' }, kinds, refresh }
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

  const unmatch = async (runId: string) => {
    const clears = overrideClears(ready.overrides, week.weekRuns, runId)
    for (const id of clears) await storage.deleteOverride(id)
    setLoaded((current) => {
      if (!current) return current
      const overrides = { ...current.overrides }
      for (const id of clears) delete overrides[id]
      return { ...current, overrides }
    })
  }

  return {
    schedule: {
      status: 'ready',
      weekIndex,
      target: view.target,
      weekStart: week.weekStart,
      availability: ready.availability,
      overrides: ready.overrides,
      rows: week.rows,
      extraRuns: week.extraRuns,
      weekRuns: week.weekRuns,
      save,
      match,
      unmatch,
    },
    kinds,
    refresh,
  }
}
