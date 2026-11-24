/**
 * WeekPager.tsx: the Home week strip you can swipe sideways.
 *
 * Up to three panels side by side, snapping into place: last week on the
 * left, this week in the middle (where it opens), and next week on the right,
 * dimmed and labelled "projected" (see projectedRows: the plan the gate would
 * give if this week ends on its target). Last week is loaded from storage
 * (PastWeekStrip); week 1 has no last week and race week no next week. With
 * only this week, it is just the strip with no scrolling. Days with a run in
 * this week or last week are tappable through onOpenRun.
 */
import { useLayoutEffect, useRef } from 'react'
import { weekStartDate } from '../engine'
import type { IsoDate, Run } from '../engine/types'
import { targetForWeek } from '../plan/pastWeeks'
import type { PlanView } from '../plan/progress'
import { projectedRows } from '../plan/projection'
import { usePlanSettings } from '../plan/usePlanSettings'
import { dateOfDay, type PlannedRow } from '../plan/weekMatch'
import { formatRange } from './format'
import { PastWeekStrip } from './PastWeekStrip'
import { WeekStrip } from './WeekStrip'

const Label = ({ text, start }: { text: string; start: IsoDate }) => (
  <p className="week-panel-label muted">
    {`${text} · ${formatRange(start, dateOfDay(start, 6))}`}
  </p>
)

export const WeekPager = ({
  view,
  runs,
  today,
  weekIndex,
  weekStart,
  rows,
  extraRuns,
  onOpenRun,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  weekIndex: number
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
  onOpenRun: (run: Run) => void
}) => {
  const scroller = useRef<HTMLDivElement>(null)
  const settings = usePlanSettings()
  const lastTarget =
    weekIndex > 1 ? targetForWeek(view, weekIndex - 1, settings) : undefined
  const lastStart =
    lastTarget && weekStartDate(weekIndex - 1, settings.startDate)
  const next = view.projectedNext
  const nextStart = next && weekStartDate(next.weekIndex, settings.startDate)
  const hasLast = lastTarget !== undefined

  // Open on this week: scroll past the last-week panel when there is one.
  useLayoutEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = hasLast ? element.clientWidth : 0
  }, [hasLast])

  const current = (
    <WeekStrip
      weekStart={weekStart}
      rows={rows}
      extraRuns={extraRuns}
      today={today}
      onOpenRun={onOpenRun}
    />
  )
  if (!lastTarget && !next) return current

  return (
    <div
      className="week-pager"
      ref={scroller}
      role="region"
      aria-label="Weeks: swipe for last or next week"
      tabIndex={0}
    >
      {lastTarget && lastStart && (
        <div className="week-panel">
          <Label text="Last week" start={lastStart} />
          <PastWeekStrip
            weekIndex={weekIndex - 1}
            target={lastTarget}
            runs={runs}
            today={today}
            onOpenRun={onOpenRun}
            stripLabel="Last week"
          />
        </div>
      )}
      <div className="week-panel">
        <Label text="This week" start={weekStart} />
        {current}
      </div>
      {next && nextStart && (
        <div className="week-panel week-panel-projected">
          <Label text="Next week · projected" start={nextStart} />
          <WeekStrip
            weekStart={nextStart}
            rows={projectedRows(next, nextStart, settings)}
            extraRuns={[]}
            today={today}
            stripLabel="Next week, projected"
          />
        </div>
      )}
    </div>
  )
}
