import { describe, expect, it } from 'vitest'
import {
  parseForecast,
  parseOpenMeteoPlace,
  parseReverseName,
  parseZipPlace,
} from './parse'

const daily = {
  daily: {
    time: ['2026-11-20', '2026-11-21'],
    weather_code: [3, 61],
    temperature_2m_max: [58.2, 50.6],
    temperature_2m_min: [44.4, 41.5],
    apparent_temperature_max: [55.5, 46.1],
    precipitation_probability_max: [10, 80],
  },
}

describe('parseForecast', () => {
  it('reads the day asked for, rounded to whole numbers', () => {
    expect(parseForecast(daily, '2026-11-20')).toEqual({
      condition: 'cloudy',
      highF: 58,
      lowF: 44,
      feelsLikeHighF: 56,
      rainChance: 10,
    })
    expect(parseForecast(daily, '2026-11-21')).toEqual({
      condition: 'rain',
      highF: 51,
      lowF: 42,
      feelsLikeHighF: 46,
      rainChance: 80,
    })
  })

  it('is undefined for a day outside the forecast', () => {
    expect(parseForecast(daily, '2026-12-25')).toBeUndefined()
  })

  it('treats a missing rain chance as zero', () => {
    const d = {
      daily: { ...daily.daily, precipitation_probability_max: [null, null] },
    }
    expect(parseForecast(d, '2026-11-20')?.rainChance).toBe(0)
  })

  it('throws for a response that is not a forecast', () => {
    expect(() => parseForecast({}, '2026-11-20')).toThrow(
      'Unexpected weather response',
    )
    expect(() => parseForecast(null, '2026-11-20')).toThrow(
      'Unexpected weather response',
    )
    expect(() =>
      parseForecast({ daily: { time: ['2026-11-20'] } }, '2026-11-20'),
    ).toThrow('Unexpected weather response')
  })
})

describe('parseOpenMeteoPlace', () => {
  it('reads the first match with a readable label', () => {
    expect(
      parseOpenMeteoPlace({
        results: [
          {
            name: 'Brooklyn',
            latitude: 40.65,
            longitude: -73.95,
            admin1: 'New York',
          },
        ],
      }),
    ).toEqual({ lat: 40.65, lon: -73.95, label: 'Brooklyn, New York' })
  })

  it('works without a region', () => {
    expect(
      parseOpenMeteoPlace({
        results: [{ name: 'Paris', latitude: 48.85, longitude: 2.35 }],
      })?.label,
    ).toBe('Paris')
  })

  it('is undefined when nothing matched', () => {
    expect(parseOpenMeteoPlace({})).toBeUndefined()
    expect(parseOpenMeteoPlace({ results: [] })).toBeUndefined()
    expect(parseOpenMeteoPlace(null)).toBeUndefined()
  })
})

describe('parseZipPlace', () => {
  it('reads a US zip code', () => {
    expect(
      parseZipPlace({
        'post code': '10001',
        places: [
          {
            'place name': 'New York',
            longitude: '-73.9967',
            latitude: '40.7484',
            'state abbreviation': 'NY',
          },
        ],
      }),
    ).toEqual({ lat: 40.7484, lon: -73.9967, label: 'New York, NY' })
  })

  it('is undefined for an unknown zip', () => {
    expect(parseZipPlace({})).toBeUndefined()
    expect(parseZipPlace({ places: [] })).toBeUndefined()
  })
})

describe('parseReverseName', () => {
  it('names a US spot with its state', () => {
    expect(
      parseReverseName({
        locality: 'Bronx',
        city: 'New York',
        principalSubdivisionCode: 'US-NY',
        countryCode: 'US',
      }),
    ).toBe('Bronx, NY')
  })

  it('falls back to the city when there is no locality', () => {
    expect(
      parseReverseName({
        locality: '',
        city: 'Boston',
        principalSubdivisionCode: 'US-MA',
        countryCode: 'US',
      }),
    ).toBe('Boston, MA')
  })

  it('uses the country code outside the US', () => {
    expect(parseReverseName({ city: 'Paris', countryCode: 'FR' })).toBe(
      'Paris, FR',
    )
  })

  it('is undefined when there is no name', () => {
    expect(parseReverseName({ countryCode: 'US' })).toBeUndefined()
    expect(parseReverseName(null)).toBeUndefined()
  })
})
