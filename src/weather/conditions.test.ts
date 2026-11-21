import { describe, expect, it } from 'vitest'
import { conditionOf, conditionLabel, weatherNotes } from './conditions'
import type { DayForecast } from './types'

describe('conditionOf (WMO weather codes)', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'partly'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'rain'],
    [55, 'rain'],
    [61, 'rain'],
    [65, 'rain'],
    [66, 'rain'],
    [80, 'rain'],
    [82, 'rain'],
    [71, 'snow'],
    [75, 'snow'],
    [77, 'snow'],
    [85, 'snow'],
    [86, 'snow'],
    [95, 'storm'],
    [96, 'storm'],
    [99, 'storm'],
  ] as const)('code %i is %s', (code, expected) => {
    expect(conditionOf(code)).toBe(expected)
  })

  it('treats an unknown code as cloudy', () => {
    expect(conditionOf(1234)).toBe('cloudy')
  })
})

describe('conditionLabel', () => {
  it('has a plain label for every condition', () => {
    expect(conditionLabel('clear')).toBe('Sunny')
    expect(conditionLabel('partly')).toBe('Partly cloudy')
    expect(conditionLabel('cloudy')).toBe('Cloudy')
    expect(conditionLabel('fog')).toBe('Foggy')
    expect(conditionLabel('rain')).toBe('Rain')
    expect(conditionLabel('snow')).toBe('Snow')
    expect(conditionLabel('storm')).toBe('Thunderstorms')
  })
})

const day = (change: Partial<DayForecast> = {}): DayForecast => ({
  condition: 'clear',
  highF: 60,
  lowF: 45,
  feelsLikeHighF: 58,
  rainChance: 10,
  ...change,
})

describe('weatherNotes', () => {
  it('has nothing to say on a mild, dry day', () => {
    expect(weatherNotes(day())).toEqual([])
  })

  it('warns about a very hot day', () => {
    expect(weatherNotes(day({ feelsLikeHighF: 92 }))[0]).toMatch(/very hot/i)
  })

  it('suggests water on a warm day', () => {
    expect(weatherNotes(day({ feelsLikeHighF: 83 }))[0]).toMatch(/warm/i)
  })

  it('does not call 79 warm, and does call 80 warm', () => {
    expect(weatherNotes(day({ feelsLikeHighF: 79 }))).toEqual([])
    expect(weatherNotes(day({ feelsLikeHighF: 80 }))).toHaveLength(1)
  })

  it('warns about a very cold day, and a chilly one', () => {
    expect(weatherNotes(day({ feelsLikeHighF: 20 }))[0]).toMatch(/very cold/i)
    expect(weatherNotes(day({ feelsLikeHighF: 35 }))[0]).toMatch(/chilly/i)
  })

  it('says rain is likely at 60 percent or more', () => {
    expect(weatherNotes(day({ rainChance: 59 }))).toEqual([])
    expect(weatherNotes(day({ rainChance: 60 }))[0]).toMatch(/rain/i)
  })

  it('suggests moving a run in thunderstorms', () => {
    const notes = weatherNotes(day({ condition: 'storm', rainChance: 80 }))
    expect(notes[0]).toMatch(/thunderstorm/i)
  })

  it('can give a temperature note and a rain note together', () => {
    expect(
      weatherNotes(day({ feelsLikeHighF: 85, rainChance: 70 })),
    ).toHaveLength(2)
  })
})
