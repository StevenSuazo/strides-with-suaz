/**
 * TodayPage.tsx: the full page for today's workout.
 *
 * Opened by tapping the Today card. A header coloured like the run (purple
 * for long, blue for easy, grey otherwise, the same colours as the week strip)
 * shows the date, the run type, miles and status, then below it a short summary and a few general tips for that kind of day
 * (see runAdvice) with a note that they are not medical advice. On a rest day
 * it says what is next. Back goes back to Home through onBack. Between the
 * header and the tips sits the weather card (see WeatherSection), with the
 * weather icon in the header's top-right corner. The workout itself is not
 * loaded here: pass it what todayInfo worked out.
 */
import type { IsoDate } from '../engine/types'
import { adviceFor } from '../plan/runAdvice'
import type { TodayInfo } from '../plan/todayInfo'
import { useWeather } from '../weather/useWeather'
import { formatDate, formatMiles } from './format'
import { WeatherCorner, WeatherSection } from './WeatherSection'

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
  const weather = useWeather(today)
  return (
    <>
      <header className={`today-hero hero-${info.kind}`}>
        <WeatherCorner state={weather.state} />
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
      <WeatherSection
        state={weather.state}
        notice={weather.notice}
        locateMe={() => void weather.locateMe()}
        lookUp={(query) => void weather.lookUp(query)}
        clear={weather.clear}
        retry={weather.retry}
      />
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
