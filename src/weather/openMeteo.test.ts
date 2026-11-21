import { describe, expect, it, vi } from 'vitest'
import { createOpenMeteoService } from './openMeteo'

const json = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: async () => body } as Response)

const forecastBody = {
  daily: {
    time: ['2026-11-20'],
    weather_code: [0],
    temperature_2m_max: [60],
    temperature_2m_min: [45],
    apparent_temperature_max: [58],
    precipitation_probability_max: [5],
  },
}
const place = { lat: 40.65, lon: -73.95, label: 'Brooklyn' }

describe('forecast', () => {
  it('asks Open-Meteo for daily Fahrenheit numbers at the place', async () => {
    const fetchFn = vi.fn().mockReturnValue(json(forecastBody))
    const service = createOpenMeteoService(fetchFn)
    const result = await service.forecast(place, '2026-11-20')
    const url = new URL(fetchFn.mock.calls[0][0] as string)
    expect(url.origin + url.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast',
    )
    expect(url.searchParams.get('latitude')).toBe('40.65')
    expect(url.searchParams.get('longitude')).toBe('-73.95')
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('daily')).toContain('apparent_temperature_max')
    expect(result).toMatchObject({ condition: 'clear', highF: 60 })
  })

  it('is undefined for a day the forecast does not cover', async () => {
    const service = createOpenMeteoService(() => json(forecastBody))
    expect(await service.forecast(place, '2027-03-21')).toBeUndefined()
  })

  it('throws a readable error when the service fails', async () => {
    const service = createOpenMeteoService(() => json({}, false, 500))
    await expect(service.forecast(place, '2026-11-20')).rejects.toThrow(
      'Weather service error (500)',
    )
  })

  it('passes along a network failure', async () => {
    const service = createOpenMeteoService(() =>
      Promise.reject(new Error('offline')),
    )
    await expect(service.forecast(place, '2026-11-20')).rejects.toThrow(
      'offline',
    )
  })
})

describe('findPlace', () => {
  it('looks a 5-digit zip up with the zip service', async () => {
    const fetchFn = vi.fn().mockReturnValue(
      json({
        places: [
          {
            'place name': 'New York',
            latitude: '40.7',
            longitude: '-74',
            'state abbreviation': 'NY',
          },
        ],
      }),
    )
    const service = createOpenMeteoService(fetchFn)
    expect(await service.findPlace(' 10001 ')).toEqual({
      lat: 40.7,
      lon: -74,
      label: 'New York, NY',
    })
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.zippopotam.us/us/10001')
  })

  it('is undefined for a zip the service does not know (404)', async () => {
    const service = createOpenMeteoService(() => json({}, false, 404))
    expect(await service.findPlace('00000')).toBeUndefined()
  })

  it('searches a city name with the Open-Meteo search', async () => {
    const fetchFn = vi.fn().mockReturnValue(
      json({
        results: [
          {
            name: 'Brooklyn',
            latitude: 40.65,
            longitude: -73.95,
            admin1: 'New York',
          },
        ],
      }),
    )
    const service = createOpenMeteoService(fetchFn)
    expect(await service.findPlace('Brooklyn, NY')).toEqual({
      lat: 40.65,
      lon: -73.95,
      label: 'Brooklyn, New York',
    })
    const url = new URL(fetchFn.mock.calls[0][0] as string)
    expect(url.origin + url.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    )
    expect(url.searchParams.get('name')).toBe('Brooklyn')
    expect(url.searchParams.get('count')).toBe('1')
  })

  it('is undefined for an empty search and makes no request', async () => {
    const fetchFn = vi.fn()
    const service = createOpenMeteoService(fetchFn)
    expect(await service.findPlace('   ')).toBeUndefined()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('throws a readable error when the search fails', async () => {
    const service = createOpenMeteoService(() => json({}, false, 503))
    await expect(service.findPlace('Paris')).rejects.toThrow(
      'Place search error (503)',
    )
  })
})

describe('nameOf', () => {
  it('names the spot from the reverse look-up', async () => {
    const fetchFn = vi.fn().mockReturnValue(
      json({
        locality: 'Bronx',
        principalSubdivisionCode: 'US-NY',
        countryCode: 'US',
      }),
    )
    const service = createOpenMeteoService(fetchFn)
    expect(await service.nameOf(40.85, -73.87)).toBe('Bronx, NY')
    const url = new URL(fetchFn.mock.calls[0][0] as string)
    expect(url.origin + url.pathname).toBe(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
    )
    expect(url.searchParams.get('latitude')).toBe('40.85')
    expect(url.searchParams.get('longitude')).toBe('-73.87')
  })

  it('is undefined when the service fails or is offline', async () => {
    expect(
      await createOpenMeteoService(() => json({}, false, 500)).nameOf(1, 2),
    ).toBeUndefined()
    expect(
      await createOpenMeteoService(() =>
        Promise.reject(new Error('offline')),
      ).nameOf(1, 2),
    ).toBeUndefined()
  })
})
