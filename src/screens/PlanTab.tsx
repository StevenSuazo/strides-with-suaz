/**
 * PlanTab.tsx: the progress chart and this week's planned runs.
 *
 * Planned runs show done, missed or coming up against your logged runs, can be
 * re-paired by hand (or handed back to the app), and sit beside the
 * availability editor that drives the week's plan. Saving availability re-plans
 * the week. None of this changes the gate, which only looks at miles and pain.
 */
import type { IsoDate, Run } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { AvailabilityEditor } from './AvailabilityEditor'
import { PlannedWeek } from './PlannedWeek'
import { ProgressChart } from './ProgressChart'
import type { WeekSchedule } from './useWeekSchedule'

export const PlanTab = ({
  view,
  runs,
  today,
  schedule,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  schedule: WeekSchedule
}) => (
  <>
    <ProgressChart view={view} />
    {schedule.status === 'error' && (
      <p role="alert">{`Couldn't load availability: ${schedule.message}`}</p>
    )}
    {schedule.status === 'ready' && (
      <section className="card">
        <h2>Planned runs</h2>
        <PlannedWeek
          target={schedule.target}
          availability={schedule.availability}
          weekStart={schedule.weekStart}
          today={today}
          runs={runs}
          overrides={schedule.overrides}
          onMatch={schedule.match}
          onUnmatch={schedule.unmatch}
        />
        <details>
          <summary>Edit availability</summary>
          <AvailabilityEditor
            key={schedule.weekIndex}
            value={schedule.availability}
            onSave={schedule.save}
          />
        </details>
      </section>
    )}
  </>
)
