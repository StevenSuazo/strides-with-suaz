/**
 * TodayCard.tsx: today's workout, like the card at the top of Runna.
 *
 * A planned run shows its type (Easy run or Long run), the date, the miles
 * and a chip: "To do", or "Done" with the miles you actually ran. The left
 * edge is blue for an easy run and purple for a long one, the same colours as
 * the week strip. With nothing planned it says "Rest day" and what comes next
 * this week; if you logged a run anyway it shows that as an "Extra run".
 * A Show details button opens a panel under the card with a short summary and
 * a few general tips for that kind of day (see runAdvice). Shows nothing when
 * today is outside the week given. It does no loading.
 */
import { useId, useState } from 'react'
import type { IsoDate, Run } from '../engine/types'
import { adviceFor, type AdviceKind } from '../plan/runAdvice'
import { dateOfDay, type PlannedRow } from '../plan/weekMatch'
import { formatDate, formatMiles } from './format'

const KIND_TITLE = { easy: 'Easy run', long: 'Long run' }

export const TodayCard = ({
  weekStart,
  rows,
  extraRuns,
  today,
}: {
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
  today: IsoDate
}) => {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const todayIndex = [0, 1, 2, 3, 4, 5, 6].find(
    (dayIndex) => dateOfDay(weekStart, dayIndex) === today,
  )
  if (todayIndex === undefined) return null

  const planned = rows.find((row) => row.dayIndex === todayIndex)
  const extraMiles = extraRuns
    .filter((run) => run.date === today)
    .reduce((sum, run) => sum + run.miles, 0)
  const next = rows.find(
    (row) => row.dayIndex > todayIndex && row.status !== 'done',
  )

  let edge: AdviceKind = 'rest'
  let title = 'Rest day'
  let miles: string | undefined
  let status: 'done' | 'todo' | undefined
  let ran: string | undefined

  if (planned) {
    edge = planned.workout.kind
    title = KIND_TITLE[planned.workout.kind]
    miles = `${formatMiles(planned.workout.miles)} miles`
    if (planned.status === 'done' && planned.run) {
      status = 'done'
      ran = `Ran ${formatMiles(planned.run.miles)} miles`
    } else {
      status = 'todo'
    }
  } else if (extraMiles > 0) {
    edge = 'extra'
    title = 'Extra run'
    miles = `${formatMiles(extraMiles)} miles`
    status = 'done'
  }

  const advice = adviceFor(edge)

  return (
    <section className="card today-card">
      <h2>Today&apos;s workout</h2>
      <div className={`today-item kind-${edge}`}>
        <div className="today-main">
          <p className="today-title">{title}</p>
          <p className="muted">{formatDate(today)}</p>
          {!planned && !extraMiles && next && (
            <p className="muted">
              {`Next: ${formatDate(next.workout.date)}, ${next.workout.kind} run, ${formatMiles(next.workout.miles)} miles`}
            </p>
          )}
        </div>
        {miles && <p className="today-miles">{miles}</p>}
        {status && (
          <span
            className={`chip ${status === 'done' ? 'chip-done' : 'chip-upcoming'}`}
          >
            {status === 'done' ? 'Done' : 'To do'}
          </span>
        )}
        {ran && <p className="muted today-ran">{ran}</p>}
      </div>
      <button
        type="button"
        className="today-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide details' : 'Show details'}
      </button>
      <div id={panelId} className="today-details" hidden={!open}>
        {open && (
          <>
            <p>{advice.summary}</p>
            <ul>
              {advice.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <p className="muted">General tips, not medical advice.</p>
          </>
        )}
      </div>
    </section>
  )
}
