/**
 * WeekStrip.tsx: the week at a glance, Monday to Sunday.
 *
 * One column per day: the day name, the date (today is circled), a dot for
 * the planned run and its miles. The dot is blue for an easy run and purple
 * for a long run. A done day turns green with a check and the miles you ran;
 * a missed day turns red. A run on a day with nothing planned shows a grey
 * dot. Each column also has a plain-words label for screen readers.
 */
import type { IsoDate, Run } from '../engine/types'
import { dateOfDay, type PlannedRow } from '../plan/weekMatch'
import { formatMiles } from './format'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const describeRow = (name: string, row: PlannedRow): string => {
  const plan = `${name}: ${row.workout.kind} run, ${formatMiles(row.workout.miles)} miles planned`
  if (row.status === 'done' && row.run) {
    return `${plan}, done: ran ${formatMiles(row.run.miles)} miles`
  }
  return `${plan}, ${row.status === 'missed' ? 'missed' : 'coming up'}`
}

export const WeekStrip = ({
  weekStart,
  rows,
  extraRuns,
  today,
}: {
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
  today: IsoDate
}) => (
  <div className="week-strip" role="group" aria-label="This week">
    {DAY_NAMES.map((dayName, dayIndex) => {
      const date = dateOfDay(weekStart, dayIndex)
      const name = `${dayName} ${date}`
      const row = rows.find((candidate) => candidate.dayIndex === dayIndex)
      const extra = extraRuns.filter((candidate) => candidate.date === date)
      const extraMiles = extra.reduce((sum, item) => sum + item.miles, 0)

      let label = `${name}: no run planned`
      let dot: string | undefined
      let miles: string | undefined
      if (row) {
        label = describeRow(name, row)
        dot =
          row.status === 'done'
            ? 'done'
            : row.status === 'missed'
              ? 'missed'
              : row.workout.kind
        miles =
          row.status === 'done' && row.run
            ? `✓ ${formatMiles(row.run.miles)}`
            : formatMiles(row.workout.miles)
      } else if (extra.length > 0) {
        label = `${name}: extra run, ${formatMiles(extraMiles)} miles`
        dot = 'extra'
        miles = formatMiles(extraMiles)
      }

      const classes = [
        'day',
        date === today ? 'today' : '',
        row?.status === 'missed' ? 'missed' : '',
      ]
        .filter(Boolean)
        .join(' ')

      return (
        <div
          key={date}
          className={classes}
          role="group"
          aria-label={label}
          aria-current={date === today ? 'date' : undefined}
        >
          <span className="day-name">{dayName.toUpperCase()}</span>
          <span className="day-date">{Number(date.slice(8))}</span>
          {dot ? (
            <span className={`dot dot-${dot}`} />
          ) : (
            <span className="dot-space" />
          )}
          <span className="day-miles">{miles}</span>
        </div>
      )
    })}
  </div>
)
