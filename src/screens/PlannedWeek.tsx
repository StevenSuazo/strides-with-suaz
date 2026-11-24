/**
 * PlannedWeek.tsx: this week's planned runs, and how you did against them.
 *
 * Each line reads "Fri, Nov 20: long run, 4.7 miles" followed by its
 * status: "Done: ran 4.8 miles", "Missed", or "Coming up". Runs you logged
 * that matched nothing are listed under "Extra runs". Each planned run has a
 * dropdown to pick a different logged run for it; onMatch saves that. A run
 * you matched by hand also offers "Let the app decide", which calls onUnmatch
 * with the run id to go back to the app's own matching.
 * Notes from the planner are shown as they come, and miles the planner could
 * not place are called out. weekStart is the Monday of the week.
 */
import { useState } from 'react'
import { placeRuns } from '../engine'
import type {
  IsoDate,
  Run,
  WeekAvailability,
  WeekTarget,
} from '../engine/types'
import { raceWeekAvailability } from '../plan/raceWeek'
import { usePlanSettings } from '../plan/usePlanSettings'
import { dateOfDay, matchWeek } from '../plan/weekMatch'
import { formatDate, formatMiles } from './format'

const AUTO = '__auto'

export const PlannedWeek = ({
  target,
  availability,
  weekStart,
  today,
  runs,
  overrides,
  onMatch,
  onUnmatch,
}: {
  target: WeekTarget
  availability: WeekAvailability
  weekStart: IsoDate
  today: IsoDate
  runs: Run[]
  overrides: Record<string, string>
  onMatch: (workoutId: string, runId: string) => Promise<void>
  onUnmatch: (runId: string) => Promise<void>
}) => {
  const settings = usePlanSettings()
  const [error, setError] = useState<string | undefined>()
  const plan = placeRuns(
    target,
    raceWeekAvailability(availability, target.weekIndex, settings),
  )
  const { rows, extraRuns, weekRuns } = matchWeek({
    weekIndex: target.weekIndex,
    weekStart,
    planned: plan.runs,
    runs,
    overrides,
    today,
  })

  const pick = async (workoutId: string, runId: string, current?: string) => {
    setError(undefined)
    if (runId === AUTO) {
      try {
        if (current) await onUnmatch(current)
      } catch (caught) {
        const reason = caught instanceof Error ? caught.message : String(caught)
        setError(`Couldn't undo the match: ${reason}`)
      }
      return
    }
    try {
      await onMatch(workoutId, runId)
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : String(caught)
      setError(`Couldn't match the run: ${reason}`)
    }
  }

  return (
    <>
      {rows.length === 0 ? (
        <p>No runs planned this week.</p>
      ) : (
        <ul className="items">
          {rows.map(({ workout, dayIndex, status, run }) => {
            const name = formatDate(dateOfDay(weekStart, dayIndex))
            return (
              <li key={workout.id}>
                <span className="item-text">{`${name}: ${workout.kind} run, ${formatMiles(workout.miles)} miles`}</span>{' '}
                <span className={`chip chip-${status}`}>
                  {status === 'done' && run
                    ? `Done: ran ${formatMiles(run.miles)} miles`
                    : status === 'missed'
                      ? 'Missed'
                      : 'Coming up'}
                </span>
                {weekRuns.length > 0 && (
                  <select
                    aria-label={`Run for ${name}`}
                    value={run?.id ?? ''}
                    onChange={(event) =>
                      void pick(workout.id, event.target.value, run?.id)
                    }
                  >
                    <option value="" disabled>
                      Match to…
                    </option>
                    {run && overrides[run.id] === workout.id && (
                      <option value={AUTO}>Let the app decide</option>
                    )}
                    {weekRuns.map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${formatDate(option.date)}: ${formatMiles(option.miles)} miles`}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {error && <p role="alert">{error}</p>}
      {extraRuns.length > 0 && (
        <>
          <h3>Extra runs</h3>
          <ul className="items">
            {extraRuns.map((run) => (
              <li
                key={run.id}
              >{`${formatDate(run.date)}: ${formatMiles(run.miles)} miles`}</li>
            ))}
          </ul>
        </>
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
