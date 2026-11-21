import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPlace, savePlace } from './locationStore'
import type { DayForecast, Place, WeatherService } from './types'
import { useWeather } from './useWeather'
import { WeatherProvider } from './WeatherProvider'

const place: Place = { lat: 1, lon: 2, label: 'Brooklyn, New York' }
const forecast: DayForecast = {
  condition: 'clear',
  highF: 60,
  lowF: 45,
  feelsLikeHighF: 58,
  rainChance: 5,
}

const setup = (service: Partial<WeatherService> = {}) => {
  const full: WeatherService = {
    forecast: vi.fn().mockResolvedValue(forecast),
    findPlace: vi.fn().mockResolvedValue(place),
    nameOf: vi.fn().mockResolvedValue('Bronx, NY'),
    ...service,
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WeatherProvider service={full}>{children}</WeatherProvider>
  )
  return { full, ...renderHook(() => useWeather('2026-11-20'), { wrapper }) }
}

const shareLocation = () =>
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({
          coords: { latitude: 40.85, longitude: -73.87 },
        } as GeolocationPosition),
    },
  })

beforeEach(() => localStorage.clear())

describe('useWeather', () => {
  it('needs a location when none is saved, and asks the service nothing', () => {
    const { result, full } = setup()
    expect(result.current.state).toEqual({ status: 'needsLocation' })
    expect(full.forecast).not.toHaveBeenCalled()
  })

  it('loads the forecast for a saved place', async () => {
    savePlace(place)
    const { result, full } = setup()
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
    expect(result.current.state).toEqual({ status: 'ready', place, forecast })
    expect(full.forecast).toHaveBeenCalledWith(place, '2026-11-20')
  })

  it('says unavailable when the day is outside the forecast', async () => {
    savePlace(place)
    const { result } = setup({ forecast: vi.fn().mockResolvedValue(undefined) })
    await waitFor(() => expect(result.current.state.status).toBe('unavailable'))
  })

  it('reports a failure and can retry', async () => {
    savePlace(place)
    const fetchForecast = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(forecast)
    const { result } = setup({ forecast: fetchForecast })
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({ message: 'offline' })
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
  })

  it('looks a typed place up, saves it and loads its weather', async () => {
    const { result, full } = setup()
    await act(() => result.current.lookUp('Brooklyn'))
    expect(full.findPlace).toHaveBeenCalledWith('Brooklyn')
    expect(loadPlace()).toEqual(place)
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
  })

  it('tells you when no place matches and saves nothing', async () => {
    const { result } = setup({
      findPlace: vi.fn().mockResolvedValue(undefined),
    })
    await act(() => result.current.lookUp('Nowhereville'))
    expect(result.current.notice).toBe("Couldn't find that place.")
    expect(loadPlace()).toBeUndefined()
    expect(result.current.state.status).toBe('needsLocation')
  })

  it('tells you when the place search fails', async () => {
    const { result } = setup({
      findPlace: vi
        .fn()
        .mockRejectedValue(new Error('Place search error (503)')),
    })
    await act(() => result.current.lookUp('Paris'))
    expect(result.current.notice).toBe('Place search error (503)')
  })

  it('forgets the place on change location', async () => {
    savePlace(place)
    const { result } = setup()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
    act(() => result.current.clear())
    expect(result.current.state.status).toBe('needsLocation')
    expect(loadPlace()).toBeUndefined()
  })

  it('names the phone location, e.g. Bronx, NY', async () => {
    shareLocation()
    const { result, full } = setup()
    await act(() => result.current.locateMe())
    expect(full.nameOf).toHaveBeenCalledWith(40.85, -73.87)
    expect(loadPlace()).toEqual({ lat: 40.85, lon: -73.87, label: 'Bronx, NY' })
  })

  it('keeps "Your location" when the name is not found', async () => {
    shareLocation()
    const { result } = setup({ nameOf: vi.fn().mockResolvedValue(undefined) })
    await act(() => result.current.locateMe())
    expect(loadPlace()?.label).toBe('Your location')
  })
})
