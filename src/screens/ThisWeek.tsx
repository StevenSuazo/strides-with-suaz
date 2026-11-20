/**
 * ThisWeek.tsx: the "this week" screen, drawn from a PlanView.
 *
 * Shows the week number, days to the race, the target and long run with the
 * gate's reason, miles so far, whether the peak is on track, and the past
 * weeks. Before the plan starts or after the race it shows a short message
 * instead. It does no loading, so it is easy to test with any PlanView.
 */
import { daysUntilRace } from '../engine'
import type { Decision, IsoDate } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { PLAN } from '../plan/settings'

const formatMiles = (value: number): string => String(Number(value.toFixed(2)))

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`

const AFTER: Record<Decision, string> = {
  advance: 'moved up',
  repeat: 'repeated the target',
  stepBack: 'stepped back',
  recovery: 'took a recovery week',
  taper: 'started the taper',
  race: 'went to race week',
}

const raceCountdown = (today: IsoDate): string => {
  const days = daysUntilRace(today, PLAN.raceDate)
  return days === 0 ? 'Race day!' : `${plural(days, 'day')} to the race`
}

const PastWeeks = ({ weeks }: { weeks: PlanView['weeks'] }) => {
  if (weeks.length === 0) return null
  return (
    <section>
      <h3>Past weeks</h3>
      <ul className="items">
        {weeks.map(({ result, gate }) => (
          <li key={result.weekIndex}>
            {`Week ${result.weekIndex}: ran ${formatMiles(result.actualMiles)} of ${formatMiles(result.targetMiles)} miles${gate ? `, then ${AFTER[gate.decision]}` : ''}.`}
          </li>
        ))}
      </ul>
    </section>
  )
}

export const ThisWeek = ({
  view,
  today,
}: {
  view: PlanView
  today: IsoDate
}) => {
  if (view.status === 'notStarted') {
    const days = daysUntilRace(today, PLAN.startDate)
    return (
      <section className="this-week card">
        <h2>{`Plan starts in ${plural(days, 'day')}`}</h2>
        {view.target && (
          <p>{`First week: ${formatMiles(view.target.targetMiles)} miles, long run ${formatMiles(view.target.longRunMiles)} miles.`}</p>
        )}
      </section>
    )
  }

  if (view.status === 'finished' || !view.target) {
    return (
      <section className="this-week card">
        <h2>Plan complete</h2>
        <PastWeeks weeks={view.weeks} />
      </section>
    )
  }

  const { target } = view
  const peak = formatMiles(Math.max(...view.curve))

  return (
    <section className="this-week card">
      <h2>{`Week ${view.weekIndex} of ${PLAN.totalWeeks}`}</h2>
      <p className="countdown">{raceCountdown(today)}</p>

      <p className="stat">{`Target: ${formatMiles(target.targetMiles)} miles`}</p>
      <p className="stat">{`Long run: ${formatMiles(target.longRunMiles)} miles`}</p>
      <p className="muted">{view.reason ?? 'Week 1 is your starting week.'}</p>

      <p className="progress-label">{`${formatMiles(view.milesSoFar)} of ${formatMiles(target.targetMiles)} miles so far`}</p>
      <progress
        aria-label="Miles so far"
        max={target.targetMiles}
        value={view.milesSoFar}
      />

      <p>
        {view.goal.onTrack
          ? `On track for your ${peak}-mile peak.`
          : `Behind pace for your ${peak}-mile peak: about ${formatMiles(view.goal.gapMiles)} miles short.`}
      </p>

      <PastWeeks weeks={view.weeks} />
    </section>
  )
}
