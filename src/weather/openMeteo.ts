/**
 * openMeteo.ts: the real WeatherService.
 *
 * Forecasts come from Open-Meteo (free, no account or key) in Fahrenheit, for
 * the local time zone of the place. A 5-digit US zip is looked up with
 * Zippopotam; anything else is searched by name with Open-Meteo's place
 * search (only the part before a comma is searched, so "Brooklyn, NY" works).
 * fetchFn can be replaced in tests. Nothing here is cached: the service
 * worker ignores other sites, so every look-up is live.
 */
import type { IsoDate } from '../engine/types'
import { parseForecast, parseOpenMeteoPlace, parseZipPlace } from './parse'
import type { Place, WeatherService } from './types'

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'precipitation_probability_max',
].join(',')

export const createOpenMeteoService = (
  fetchFn: (url: string) => Promise<Response> = (url) => fetch(url),
): WeatherService => ({
  forecast: async (place: Place, date: IsoDate) => {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${place.lat}&longitude=${place.lon}` +
      `&daily=${DAILY}&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`
    const response = await fetchFn(url)
    if (!response.ok) {
      throw new Error(`Weather service error (${response.status})`)
    }
    return parseForecast(await response.json(), date)
  },

  findPlace: async (query: string) => {
    const text = query.trim()
    if (text === '') return undefined
    if (/^\d{5}$/.test(text)) {
      const response = await fetchFn(`https://api.zippopotam.us/us/${text}`)
      if (response.status === 404) return undefined
      if (!response.ok) {
        throw new Error(`Place search error (${response.status})`)
      }
      return parseZipPlace(await response.json())
    }
    const name = text.split(',')[0].trim()
    const response = await fetchFn(
      'https://geocoding-api.open-meteo.com/v1/search' +
        `?name=${encodeURIComponent(name)}&count=1&language=en&format=json`,
    )
    if (!response.ok) {
      throw new Error(`Place search error (${response.status})`)
    }
    return parseOpenMeteoPlace(await response.json())
  },
})
