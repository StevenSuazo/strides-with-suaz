/**
 * parse.ts: reads the JSON the weather and place lookups send back.
 *
 * parseForecast(json, date): the DayForecast for that date, undefined if the
 * date is outside the forecast, or throws "Unexpected weather response".
 * parseOpenMeteoPlace(json): the first place from Open-Meteo's search.
 * parseZipPlace(json): the place for a US zip code from Zippopotam.
 * Nothing here touches the network, so it is easy to test.
 */
import type { IsoDate } from '../engine/types'
import { conditionOf } from './conditions'
import type { DayForecast, Place } from './types'

type Obj = Record<string, unknown>
const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const series = (daily: Obj, key: string): unknown[] => {
  const value = daily[key]
  if (!Array.isArray(value)) throw new Error('Unexpected weather response')
  return value
}

const whole = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Unexpected weather response')
  }
  return Math.round(value)
}

export const parseForecast = (
  json: unknown,
  date: IsoDate,
): DayForecast | undefined => {
  if (!isObj(json) || !isObj(json.daily)) {
    throw new Error('Unexpected weather response')
  }
  const daily = json.daily
  const times = series(daily, 'time')
  const i = times.indexOf(date)
  if (i === -1) return undefined
  const rain = series(daily, 'precipitation_probability_max')[i]
  return {
    condition: conditionOf(whole(series(daily, 'weather_code')[i])),
    highF: whole(series(daily, 'temperature_2m_max')[i]),
    lowF: whole(series(daily, 'temperature_2m_min')[i]),
    feelsLikeHighF: whole(series(daily, 'apparent_temperature_max')[i]),
    rainChance: typeof rain === 'number' ? Math.round(rain) : 0,
  }
}

export const parseOpenMeteoPlace = (json: unknown): Place | undefined => {
  if (!isObj(json) || !Array.isArray(json.results)) return undefined
  const first: unknown = json.results[0]
  if (
    !isObj(first) ||
    typeof first.name !== 'string' ||
    typeof first.latitude !== 'number' ||
    typeof first.longitude !== 'number'
  ) {
    return undefined
  }
  const region = typeof first.admin1 === 'string' ? `, ${first.admin1}` : ''
  return {
    lat: first.latitude,
    lon: first.longitude,
    label: `${first.name}${region}`,
  }
}

export const parseZipPlace = (json: unknown): Place | undefined => {
  if (!isObj(json) || !Array.isArray(json.places)) return undefined
  const first: unknown = json.places[0]
  if (!isObj(first)) return undefined
  const lat = Number(first.latitude)
  const lon = Number(first.longitude)
  const name = first['place name']
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    typeof name !== 'string'
  ) {
    return undefined
  }
  const state = first['state abbreviation']
  return {
    lat,
    lon,
    label: typeof state === 'string' ? `${name}, ${state}` : name,
  }
}

// BigDataCloud reverse look-up: "Bronx, NY" for US spots, "Paris, FR" elsewhere.
export const parseReverseName = (json: unknown): string | undefined => {
  if (!isObj(json)) return undefined
  const pick = (value: unknown) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
  const name = pick(json.locality) ?? pick(json.city)
  if (!name) return undefined
  const sub = pick(json.principalSubdivisionCode)
  const country = pick(json.countryCode)
  const region =
    country === 'US' && sub?.startsWith('US-') ? sub.slice(3) : country
  return region ? `${name}, ${region}` : name
}
