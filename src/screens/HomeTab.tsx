/**
 * HomeTab.tsx: the front page: the week strip, today's workout and this week.
 *
 * The strip and today's card appear once the week's plan has loaded; tapping
 * today's card calls onOpenToday, and tapping a day with a run in the strip
 * calls onOpenRun. If the plan could not load, the reason is
 * shown. The week summary always shows.
 */
import type { IsoDate, Run } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { ThisWeek } from './ThisWeek'
import { TodayCard } from './TodayCard'
import type { WeekSchedule } from './useWeekSchedule'
import { WeekStrip } from './WeekStrip'

export const HomeTab = ({
  view,
  today,
  schedule,
  onOpenToday,
  onOpenRun,
}: {
  view: PlanView
  today: IsoDate
  schedule: WeekSchedule
  onOpenToday: () => void
  onOpenRun: (run: Run) => void
}) => (
  <>
    {schedule.status === 'ready' && (
      <>
        <WeekStrip
          weekStart={schedule.weekStart}
          rows={schedule.rows}
          extraRuns={schedule.extraRuns}
          today={today}
          onOpenRun={onOpenRun}
        />
        <TodayCard
          weekStart={schedule.weekStart}
          rows={schedule.rows}
          extraRuns={schedule.extraRuns}
          today={today}
          onOpen={onOpenToday}
        />
      </>
    )}
    <ThisWeek view={view} today={today} />
    {schedule.status === 'error' && (
      <p role="alert">{`Couldn't load availability: ${schedule.message}`}</p>
    )}
  </>
)
