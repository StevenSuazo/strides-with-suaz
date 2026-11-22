/**
 * CalendarCard.tsx: every week of the plan so far, newest first, and next week.
 *
 * - This week sits open at the top as a week strip (done days green, missed
 *   days red), when it is loaded.
 * - Next week sits under it, dimmed and labelled "Projected, subject to change":
 *   the runs the gate would plan if this week ends on its target.
 * - Each finished week is a row: "Week 3", its dates, miles run of the target
 *   and what the gate decided afterwards. Tap a row to open that week's strip.
 *   Opening it loads that week's saved availability and hand matches, rebuilds
 *   the planned runs from the target the week had, and matches them to your
 *   runs the same way the current week is matched. Weeks with nothing saved
 *   count as all days open.
 * With onOpenRun, a day with a run in any of the strips is tappable and opens
 * that run's page. Nothing here changes anything.
 */
import { useState } from 'react'
import { weekStartDate } from '../engine'
import type { IsoDate, Run } from '../engine/types'
import { targetForWeek } from '../plan/pastWeeks'
import type { PlanView, SettledWeek } from '../plan/progress'
import { projectedRows } from '../plan/projection'
import { PLAN } from '../plan/settings'
import { dateOfDay, type PlannedRow } from '../plan/weekMatch'
import { AFTER } from './decisionLabels'
import { formatMiles, formatRange } from './format'
import { PastWeekStrip } from './PastWeekStrip'
import { WeekStrip } from './WeekStrip'

export type CurrentWeek = {
  weekIndex: number
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
}

const PastWeek = ({
  week,
  view,
  runs,
  today,
  onOpenRun,
}: {
  week: SettledWeek
  view: PlanView
  runs: Run[]
  today: IsoDate
  onOpenRun?: (run: Run) => void
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
        <PastWeekStrip
          weekIndex={weekIndex}
          target={target}
          runs={runs}
          today={today}
          onOpenRun={onOpenRun}
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
  onOpenRun,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  current?: CurrentWeek
  onOpenRun?: (run: Run) => void
}) => {
  const past = [...view.weeks].reverse()
  const next = view.status === 'inProgress' ? view.projectedNext : undefined
  const nextStart = next && weekStartDate(next.weekIndex, PLAN.startDate)
  if (!current && !next && past.length === 0) return null
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
            onOpenRun={onOpenRun}
          />
        </div>
      )}
      {next && nextStart && (
        <div className="calendar-week calendar-projected">
          <p className="calendar-current">
            <strong>{`Week ${next.weekIndex}`}</strong>{' '}
            <span className="muted">
              {`${formatRange(nextStart, dateOfDay(nextStart, 6))} · Projected, subject to change`}
            </span>
          </p>
          <WeekStrip
            weekStart={nextStart}
            rows={projectedRows(next, nextStart)}
            extraRuns={[]}
            today={today}
            stripLabel={`Week ${next.weekIndex}, projected`}
          />
          {view.target && (
            <p className="muted calendar-note">
              {`If you hit this week's target of ${formatMiles(view.target.targetMiles)} miles.`}
            </p>
          )}
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
              onOpenRun={onOpenRun}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
