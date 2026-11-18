/**
 * PlannedWeek.tsx: this week's planned runs, from placeRuns.
 *
 * Each line reads "Fri 2026-11-20: long run, 4.7 miles". Notes from the
 * planner are shown as they come, and miles the planner could not place are
 * called out. weekStart is the Monday of the week.
 */
import { placeRuns } from '../engine'
import type { IsoDate, WeekAvailability, WeekTarget } from '../engine/types'
import { formatMiles } from './format'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dateOf = (weekStart: IsoDate, dayIndex: number): IsoDate => {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + dayIndex))
    .toISOString()
    .slice(0, 10)
}

export const PlannedWeek = ({
  target,
  availability,
  weekStart,
}: {
  target: WeekTarget
  availability: WeekAvailability
  weekStart: IsoDate
}) => {
  const plan = placeRuns(target, availability)
  return (
    <>
      {plan.runs.length === 0 ? (
        <p>No runs planned this week.</p>
      ) : (
        <ul>
          {plan.runs.map((run) => (
            <li key={run.dayIndex}>
              {`${DAY_NAMES[run.dayIndex]} ${dateOf(weekStart, run.dayIndex)}: ${run.kind} run, ${formatMiles(run.miles)} miles`}
            </li>
          ))}
        </ul>
      )}
      {plan.shortByMiles > 0 && (
        <p>{`Short by ${formatMiles(plan.shortByMiles)} ${plan.shortByMiles === 1 ? 'mile' : 'miles'} because of the days available.`}</p>
      )}
      {plan.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </>
  )
}
