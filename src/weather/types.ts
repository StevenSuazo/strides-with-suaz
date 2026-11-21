/**
 * types.ts: what the weather feature talks about.
 *
 * - Place: where you run (lat, lon and a name to show).
 * - DayForecast: one day: the condition, the high and low, the highest
 *   "feels like", and the highest chance of rain. Fahrenheit and whole numbers.
 * - WeatherService: looks up a forecast and finds a place from text. The real
 *   one uses Open-Meteo; tests pass a fake.
 */
import type { IsoDate } from '../engine/types'

export type Place = { lat: number; lon: number; label: string }

export type Condition =
  'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

export type DayForecast = {
  condition: Condition
  highF: number
  lowF: number
  feelsLikeHighF: number
  rainChance: number
}

export type WeatherService = {
  // undefined means the day is outside the forecast, so not available yet
  forecast: (place: Place, date: IsoDate) => Promise<DayForecast | undefined>
  // undefined means nothing matched
  findPlace: (query: string) => Promise<Place | undefined>
}
