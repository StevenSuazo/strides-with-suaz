/**
 * RunPage.tsx: the full page for one logged run.
 *
 * Opened by tapping a run in the Log list or a day with a run in a week strip.
 * A header coloured like the run (purple long, blue easy, grey otherwise, as
 * on the Today page) shows the date, the run type, the miles and where the run
 * came from. Down its right side sits the headline: the pace per mile (worked
 * out from time and miles) big, the time under it, and, if the run was matched
 * to a planned workout, how far over or under the plan it was. With no time
 * logged, an "Add details" button takes its place. Below the header, the other
 * details the run has: average and max heart rate, cadence and effort; ones it
 * lacks are left out, and a run with no details at all says how to add them. A
 * matched planned workout is named. Back goes through onBack; Edit run (or Add
 * details) hands the run to onEdit.
 */
import type { Run, RunKind, Workout } from '../engine/types'
import { formatDuration, paceOf } from './duration'
import { formatDate, formatMiles } from './format'

type Stat = { label: string; value: string }

const statsOf = (run: Run): Stat[] => {
  const stats: Stat[] = []
  if (run.avgHeartRate !== undefined) {
    stats.push({
      label: 'Average heart rate',
      value: `${run.avgHeartRate} bpm`,
    })
  }
  if (run.maxHeartRate !== undefined) {
    stats.push({ label: 'Max heart rate', value: `${run.maxHeartRate} bpm` })
  }
  if (run.cadence !== undefined) {
    stats.push({ label: 'Cadence', value: `${run.cadence} spm` })
  }
  if (run.effort !== undefined) {
    stats.push({ label: 'Effort', value: `${run.effort} of 10` })
  }
  return stats
}

const TITLES: Record<RunKind, string> = { easy: 'Easy run', long: 'Long run' }

export const RunPage = ({
  run,
  kind,
  planned,
  onBack,
  onEdit,
}: {
  run: Run
  kind?: RunKind
  planned?: Workout
  onBack: () => void
  onEdit: (run: Run) => void
}) => {
  const stats = statsOf(run)
  const pace =
    run.durationSeconds === undefined
      ? undefined
      : paceOf(run.durationSeconds, run.miles)
  const hasAnyDetail = stats.length > 0 || run.durationSeconds !== undefined
  const difference = planned
    ? Math.round((run.miles - planned.miles) * 100) / 100
    : undefined
  return (
    <>
      <header className={`today-hero hero-${kind ?? 'extra'}`}>
        <button
          type="button"
          className="back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹ Back
        </button>
        <div className="run-side">
          {run.durationSeconds !== undefined ? (
            <>
              {pace && <p className="run-pace">{`${pace} /mi`}</p>}
              <p>{formatDuration(run.durationSeconds)}</p>
            </>
          ) : (
            <button type="button" onClick={() => onEdit(run)}>
              Add details
            </button>
          )}
          {difference !== undefined && (
            <p>
              {Math.abs(difference) < 0.05
                ? 'On plan'
                : `${difference > 0 ? '+' : '-'}${formatMiles(Math.abs(difference))} mi vs plan`}
            </p>
          )}
        </div>
        <p className="muted">{formatDate(run.date)}</p>
        <h2>{kind ? TITLES[kind] : 'Run'}</h2>
        <p className="today-miles">{`${formatMiles(run.miles)} miles`}</p>
        <p className="muted">
          {run.source === 'strava' ? 'From Strava' : 'Logged in the app'}
        </p>
      </header>
      <section className="card run-page">
        {stats.length > 0 && (
          <>
            <h3>Details</h3>
            <dl className="run-stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {!hasAnyDetail && (
          <p className="muted">
            No extra details yet. Tap Edit run to add the time, heart rate and
            more.
          </p>
        )}
        {planned && (
          <p>
            {`Planned: ${formatDate(planned.date)}, ${planned.kind} run, ${formatMiles(planned.miles)} miles`}
          </p>
        )}
        <button type="button" onClick={() => onEdit(run)}>
          Edit run
        </button>
      </section>
    </>
  )
}
