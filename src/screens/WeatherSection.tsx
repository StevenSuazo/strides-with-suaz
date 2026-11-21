/**
 * WeatherSection.tsx: the weather on the Today page, drawn inside the coloured
 * header (no box of its own). Two pieces, both taking the state from
 * useWeather: WeatherSide goes first in the header and floats right;
 * WeatherExtras goes last and spans the full width.
 *
 * - With a forecast: the icon and high temperature down the right side, with
 *   the rain chance and the place ("Change location") under
 *   them, then any heat/cold/rain notes across the full width.
 * - With no place saved: "Use my location" and a box for a city or ZIP code,
 *   across the full width.
 * - Loading, "Forecast not available yet" (the day is past the ~week the
 *   forecast covers) and errors with a retry button stay small on the right.
 */
import { useState, type FormEvent } from 'react'
import { weatherNotes } from '../weather/conditions'
import type { WeatherState } from '../weather/useWeather'
import { WeatherIcon } from './WeatherIcon'

const PlaceLine = ({ label, clear }: { label: string; clear: () => void }) => (
  <p className="weather-place muted">
    <span>{label}</span>{' '}
    <button type="button" className="link" onClick={clear}>
      Change location
    </button>
  </p>
)

export const WeatherSide = ({
  state,
  clear,
  retry,
}: {
  state: WeatherState
  clear: () => void
  retry: () => void
}) => {
  if (state.status === 'needsLocation') return null
  return (
    <div className="weather-side">
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
          <WeatherIcon condition={state.forecast.condition} />
          <p className="weather-temp">{`${state.forecast.highF}°`}</p>
          <p>{`${state.forecast.rainChance}% chance of rain`}</p>
          <PlaceLine label={state.place.label} clear={clear} />
        </>
      )}
    </div>
  )
}

export const WeatherExtras = ({
  state,
  notice,
  locateMe,
  lookUp,
}: {
  state: WeatherState
  notice?: string
  locateMe: () => void
  lookUp: (query: string) => void
}) => {
  const [query, setQuery] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = query.trim()
    if (text !== '') lookUp(text)
  }

  if (state.status === 'needsLocation') {
    return (
      <div className="weather-setup">
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
      </div>
    )
  }
  if (state.status !== 'ready') return null
  return (
    <>
      {weatherNotes(state.forecast).map((note) => (
        <p key={note} className="weather-note">
          {note}
        </p>
      ))}
    </>
  )
}
