/**
 * WeatherSection.tsx: the weather parts of the Today page.
 *
 * Both take the state from useWeather and only draw it:
 * - WeatherCorner: the icon and the day's high, for the top-right of the
 *   coloured header. Draws nothing until there is a forecast.
 * - WeatherSection: a card. With no place saved it offers "Use my location"
 *   and a box for a city or ZIP code. With a forecast it shows the high, low,
 *   feels-like, rain chance, any heat/cold/rain notes and the place with
 *   "Change location". Also covers loading, "Forecast not available yet"
 *   (the day is past the ~week the forecast covers) and errors with retry.
 */
import { useState, type FormEvent } from 'react'
import { conditionLabel, weatherNotes } from '../weather/conditions'
import type { WeatherState } from '../weather/useWeather'
import { WeatherIcon } from './WeatherIcon'

export const WeatherCorner = ({ state }: { state: WeatherState }) => {
  if (state.status !== 'ready') return null
  const { forecast } = state
  return (
    <div className="weather-corner">
      <WeatherIcon condition={forecast.condition} />
      <span className="weather-temp">{`${forecast.highF}°`}</span>
    </div>
  )
}

type Actions = {
  locateMe: () => void
  lookUp: (query: string) => void
  clear: () => void
  retry: () => void
}

const PlaceLine = ({ label, clear }: { label: string; clear: () => void }) => (
  <p className="weather-place muted">
    <span>{label}</span>{' '}
    <button type="button" className="link" onClick={clear}>
      Change location
    </button>
  </p>
)

export const WeatherSection = ({
  state,
  notice,
  locateMe,
  lookUp,
  clear,
  retry,
}: { state: WeatherState; notice?: string } & Actions) => {
  const [query, setQuery] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = query.trim()
    if (text !== '') lookUp(text)
  }

  return (
    <section className="card weather-section">
      <h3>Weather</h3>
      {state.status === 'needsLocation' && (
        <>
          <p>See the forecast for your run.</p>
          <button type="button" onClick={locateMe}>
            Use my location
          </button>
          <form className="weather-form" onSubmit={submit}>
            <label>
              City or ZIP code
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="submit">Look up</button>
          </form>
          {notice && <p role="alert">{notice}</p>}
        </>
      )}
      {state.status === 'loading' && <p>Loading the weather…</p>}
      {state.status === 'unavailable' && (
        <>
          <p>Forecast not available yet</p>
          <PlaceLine label={state.place.label} clear={clear} />
        </>
      )}
      {state.status === 'error' && (
        <>
          <p role="alert">{`Couldn't load the weather: ${state.message}`}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
          <PlaceLine label={state.place.label} clear={clear} />
        </>
      )}
      {state.status === 'ready' && (
        <>
          <p className="weather-summary">
            {conditionLabel(state.forecast.condition)}
          </p>
          <p>{`High ${state.forecast.highF}° / Low ${state.forecast.lowF}°`}</p>
          <p>{`Feels like ${state.forecast.feelsLikeHighF}°`}</p>
          <p>{`${state.forecast.rainChance}% chance of rain`}</p>
          {weatherNotes(state.forecast).map((note) => (
            <p key={note} className="weather-note">
              {note}
            </p>
          ))}
          <PlaceLine label={state.place.label} clear={clear} />
        </>
      )}
    </section>
  )
}
