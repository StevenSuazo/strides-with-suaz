/**
 * RunPage.tsx: the full page for one logged run.
 *
 * Opened by tapping a run in the Log list or a day with a run in a week strip.
 * A header coloured like the run (purple long, blue easy, grey otherwise, as
 * on the Today page) shows the date, the run type, the miles and where the run
 * came from. Below it, the details the run has: time, pace per mile (worked
 * out from time and miles), average and max heart rate, cadence and effort.
 * Details the run lacks are simply left out; a run with none says how to add
 * them. If the run was matched to a planned workout this week, that workout is
 * named. Back goes through onBack; Edit run hands the run to onEdit.
 */
import type { Run, RunKind, Workout } from '../engine/types'
import { formatDuration, paceOf } from './duration'
import { formatDate, formatMiles } from './format'

type Stat = { label: string; value: string }

const statsOf = (run: Run): Stat[] => {
  const stats: Stat[] = []
  if (run.durationSeconds !== undefined) {
    stats.push({ label: 'Time', value: formatDuration(run.durationSeconds) })
    const pace = paceOf(run.durationSeconds, run.miles)
    if (pace) stats.push({ label: 'Pace', value: `${pace} /mi` })
  }
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
        <p className="muted">{formatDate(run.date)}</p>
        <h2>{kind ? TITLES[kind] : 'Run'}</h2>
        <p className="today-miles">{`${formatMiles(run.miles)} miles`}</p>
        <p className="muted">
          {run.source === 'strava' ? 'From Strava' : 'Logged in the app'}
        </p>
      </header>
      <section className="card run-page">
        <h3>Details</h3>
        {stats.length > 0 ? (
          <dl className="run-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
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
