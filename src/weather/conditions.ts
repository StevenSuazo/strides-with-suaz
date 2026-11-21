/**
 * conditions.ts: turns Open-Meteo's weather codes into plain conditions, and
 * a forecast into short notes for a runner.
 *
 * conditionOf(code): the condition for a WMO weather code (unknown: cloudy).
 * conditionLabel(condition): "Sunny", "Partly cloudy", "Rain", and so on.
 * weatherNotes(forecast): up to two short sentences, one about the
 * temperature ("feels like" high) and one about rain or storms. Empty on a
 * mild, dry day. General tips only, not medical advice.
 */
import type { Condition, DayForecast } from './types'

export const conditionOf = (code: number): Condition => {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code === 85 || code === 86) return 'snow'
  if (code >= 95 && code <= 99) return 'storm'
  return 'cloudy'
}

const LABELS: Record<Condition, string> = {
  clear: 'Sunny',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Foggy',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorms',
}

export const conditionLabel = (condition: Condition): string =>
  LABELS[condition]

export const weatherNotes = (forecast: DayForecast): string[] => {
  const notes: string[] = []
  const feels = forecast.feelsLikeHighF
  if (feels >= 90) {
    notes.push('Very hot. Start early, slow down and carry extra water.')
  } else if (feels >= 80) {
    notes.push('Warm. Bring water and go a little easier.')
  } else if (feels <= 25) {
    notes.push('Very cold. Dress in layers and cover your hands and ears.')
  } else if (feels <= 40) {
    notes.push('Chilly. A light extra layer will help early on.')
  }
  if (forecast.condition === 'storm') {
    notes.push(
      'Thunderstorms in the forecast. Think about moving this run to another time or day.',
    )
  } else if (forecast.rainChance >= 60) {
    notes.push('Rain is likely. Wear something that dries quickly.')
  }
  return notes
}
