/**
 * HomeTab.tsx: the front page: the swipeable week strip (WeekPager), today's
 * workout and this week.
 *
 * The strip and today's card appear once the week's plan has loaded; tapping
 * today's card calls onOpenToday, and tapping a day with a run in the strip
 * calls onOpenRun (as does today's card once today's run is logged). If the plan could not load, the reason is
 * shown. The week summary always shows.
 */
import type { IsoDate, Run } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { ThisWeek } from './ThisWeek'
import { TodayCard } from './TodayCard'
import type { WeekSchedule } from './useWeekSchedule'
import { WeekPager } from './WeekPager'

export const HomeTab = ({
  view,
  runs,
  today,
  schedule,
  onOpenToday,
  onOpenRun,
}: {
  view: PlanView
  runs: Run[]
  today: IsoDate
  schedule: WeekSchedule
  onOpenToday: () => void
  onOpenRun: (run: Run) => void
}) => (
  <>
    {schedule.status === 'ready' && (
      <>
        <WeekPager
          view={view}
          runs={runs}
          today={today}
          weekIndex={schedule.weekIndex}
          weekStart={schedule.weekStart}
          rows={schedule.rows}
          extraRuns={schedule.extraRuns}
          onOpenRun={onOpenRun}
        />
        <TodayCard
          weekStart={schedule.weekStart}
          rows={schedule.rows}
          extraRuns={schedule.extraRuns}
          today={today}
          onOpen={onOpenToday}
          onOpenRun={onOpenRun}
        />
      </>
    )}
    <ThisWeek view={view} today={today} />
    {schedule.status === 'error' && (
      <p role="alert">{`Couldn't load availability: ${schedule.message}`}</p>
    )}
  </>
)
