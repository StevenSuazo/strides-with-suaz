/**
 * CalendarCard.tsx: every week of the plan so far, newest first.
 *
 * - This week sits open at the top as a week strip (done days green, missed
 *   days red), when it is loaded.
 * - Each finished week is a row: "Week 3", its dates, miles run of the target
 *   and what the gate decided afterwards. Tap a row to open that week's strip.
 *   Opening it loads that week's saved availability and hand matches, rebuilds
 *   the planned runs from the target the week had, and matches them to your
 *   runs the same way the current week is matched. Weeks with nothing saved
 *   count as all days open.
 * Nothing here changes anything: it is a look back.
 */
import { useEffect, useState } from 'react'
import { placeRuns, weekStartDate } from '../engine'
import type {
  IsoDate,
  Run,
  WeekAvailability,
  WeekTarget,
} from '../engine/types'
import { targetForWeek } from '../plan/pastWeeks'
import type { PlanView, SettledWeek } from '../plan/progress'
import { PLAN } from '../plan/settings'
import { dateOfDay, matchWeek, type PlannedRow } from '../plan/weekMatch'
import { useStorage } from '../storage/useStorage'
import { AFTER } from './decisionLabels'
import { formatMiles, formatRange } from './format'
import { WeekStrip } from './WeekStrip'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

export type CurrentWeek = {
  weekIndex: number
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
}

type Loaded = {
  availability: WeekAvailability
  overrides: Record<string, string>
}

const PastWeekBody = ({
  weekIndex,
  target,
  runs,
  today,
}: {
  weekIndex: number
  target: WeekTarget
  runs: Run[]
  today: IsoDate
}) => {
  const storage = useStorage()
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

  const weekStart = weekStartDate(weekIndex, PLAN.startDate)
  const { rows, extraRuns } = matchWeek({
    weekIndex,
    weekStart,
    planned: placeRuns(target, loaded.availability).runs,
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
      stripLabel={`Week ${weekIndex}`}
    />
  )
}

const PastWeek = ({
  week,
  view,
  runs,
  today,
}: {
  week: SettledWeek
  view: PlanView
  runs: Run[]
  today: IsoDate
}) => {
  const [open, setOpen] = useState(false)
  const { weekIndex, targetMiles, actualMiles } = week.result
  const weekStart = weekStartDate(weekIndex, PLAN.startDate)
  const target = targetForWeek(view, weekIndex)
  return (
    <li className="calendar-week">
      <button
        type="button"
        className="calendar-row"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="calendar-row-main">
          <strong>{`Week ${weekIndex}`}</strong>
          <span className="muted">
            {formatRange(weekStart, dateOfDay(weekStart, 6))}
          </span>
        </span>
        <span className="calendar-row-miles">
          {`${formatMiles(actualMiles)} of ${formatMiles(targetMiles)} mi`}
        </span>
        {week.gate && (
          <span className="muted calendar-row-gate">
            {`Then ${AFTER[week.gate.decision]}`}
          </span>
        )}
      </button>
      {open && target && (
        <PastWeekBody
          weekIndex={weekIndex}
          target={target}
          runs={runs}
          today={today}
        />
      )}
    </li>
  )
}

export const CalendarCard = ({
  view,
  runs,
  today,
  current,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  current?: CurrentWeek
}) => {
  const past = [...view.weeks].reverse()
  if (!current && past.length === 0) return null
  return (
    <section className="card calendar-card">
      <h2>Calendar</h2>
      {current && (
        <div className="calendar-week">
          <p className="calendar-current">
            <strong>{`Week ${current.weekIndex}`}</strong>{' '}
            <span className="muted">
              {`${formatRange(current.weekStart, dateOfDay(current.weekStart, 6))} · This week`}
            </span>
          </p>
          <WeekStrip
            weekStart={current.weekStart}
            rows={current.rows}
            extraRuns={current.extraRuns}
            today={today}
            stripLabel={`Week ${current.weekIndex}, this week`}
          />
        </div>
      )}
      {past.length > 0 && (
        <ul className="calendar-list">
          {past.map((week) => (
            <PastWeek
              key={week.result.weekIndex}
              week={week}
              view={view}
              runs={runs}
              today={today}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
