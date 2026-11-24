/**
 * CalendarCard.tsx: every week of the plan so far, newest first, and next week.
 *
 * - Next week is a row at the very top, closed until you tap it: "Projected,
 *   subject to change", the runs the gate would plan if this week ends on its
 *   target (shown dimmed).
 * - This week sits open under it as a week strip (done days green, missed
 *   days red), when it is loaded, and stays open.
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
import type { IsoDate, Run, WeekTarget } from '../engine/types'
import { targetForWeek } from '../plan/pastWeeks'
import type { PlanView, SettledWeek } from '../plan/progress'
import { projectedRows } from '../plan/projection'
import { usePlanSettings } from '../plan/usePlanSettings'
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
  const settings = usePlanSettings()
  const [open, setOpen] = useState(false)
  const { weekIndex, targetMiles, actualMiles } = week.result
  const weekStart = weekStartDate(weekIndex, settings.startDate)
  const target = targetForWeek(view, weekIndex, settings)
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

const ProjectedWeek = ({
  target,
  weekStart,
  today,
  thisWeekMiles,
}: {
  target: WeekTarget
  weekStart: IsoDate
  today: IsoDate
  thisWeekMiles?: number
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="calendar-week calendar-projected">
      <button
        type="button"
        className="calendar-row"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="calendar-row-main">
          <strong>{`Week ${target.weekIndex}`}</strong>
          <span className="muted">
            {formatRange(weekStart, dateOfDay(weekStart, 6))}
          </span>
        </span>
        <span className="calendar-row-miles">Projected</span>
        <span className="muted calendar-row-gate">Subject to change</span>
      </button>
      {open && (
        <>
          <WeekStrip
            weekStart={weekStart}
            rows={projectedRows(target, weekStart)}
            extraRuns={[]}
            today={today}
            stripLabel={`Week ${target.weekIndex}, projected`}
          />
          {thisWeekMiles !== undefined && (
            <p className="muted calendar-note">
              {`If you hit this week's target of ${formatMiles(thisWeekMiles)} miles.`}
            </p>
          )}
        </>
      )}
    </div>
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
  const { startDate } = usePlanSettings()
  const past = [...view.weeks].reverse()
  const next = view.status === 'inProgress' ? view.projectedNext : undefined
  const nextStart = next && weekStartDate(next.weekIndex, startDate)
  if (!current && !next && past.length === 0) return null
  return (
    <section className="card calendar-card">
      <h2>Calendar</h2>
      {next && nextStart && (
        <ProjectedWeek
          target={next}
          weekStart={nextStart}
          today={today}
          thisWeekMiles={view.target?.targetMiles}
        />
      )}
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
