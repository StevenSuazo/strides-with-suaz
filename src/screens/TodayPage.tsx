/**
 * TodayPage.tsx: the full page for today's workout.
 *
 * Opened by tapping the Today card. A header coloured like the run (purple
 * for long, blue for easy, grey otherwise, the same colours as the week strip)
 * shows the date, the run type, miles and status, then below it a short summary and a few general tips for that kind of day
 * (see runAdvice) with a note that they are not medical advice. On a rest day
 * it says what is next. Back goes back to Home through onBack. It does no
 * loading: pass it what todayInfo worked out.
 */
import type { IsoDate } from '../engine/types'
import { adviceFor } from '../plan/runAdvice'
import type { TodayInfo } from '../plan/todayInfo'
import { formatDate, formatMiles } from './format'

export const TodayPage = ({
  info,
  today,
  onBack,
}: {
  info: TodayInfo
  today: IsoDate
  onBack: () => void
}) => {
  const advice = adviceFor(info.kind)
  return (
    <>
      <header className={`today-hero hero-${info.kind}`}>
        <button
          type="button"
          className="back"
          aria-label="Back to Home"
          onClick={onBack}
        >
          ‹ Back
        </button>
        <p className="muted">{formatDate(today)}</p>
        <h2>{info.title}</h2>
        {info.miles !== undefined && (
          <p className="today-miles">{`${formatMiles(info.miles)} miles`}</p>
        )}
        {info.status && (
          <span
            className={`chip ${info.status === 'done' ? 'chip-done' : 'chip-upcoming'}`}
          >
            {info.status === 'done' ? 'Done' : 'To do'}
          </span>
        )}
        {info.ran !== undefined && (
          <p className="muted">{`Ran ${formatMiles(info.ran)} miles`}</p>
        )}
        {info.next && (
          <p className="muted">
            {`Next: ${formatDate(info.next.date)}, ${info.next.kind} run, ${formatMiles(info.next.miles)} miles`}
          </p>
        )}
      </header>
      <section className="card today-page">
        <h3>About today</h3>
        <p>{advice.summary}</p>
        <h3>Tips</h3>
        <ul>
          {advice.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p className="muted">General tips, not medical advice.</p>
      </section>
    </>
  )
}
