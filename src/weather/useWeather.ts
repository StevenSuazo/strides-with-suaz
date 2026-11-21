/**
 * useWeather.ts: today's weather for the place saved on this device.
 *
 * state is one of:
 * - needsLocation: no place saved yet (nothing is fetched)
 * - loading, ready (forecast + place), unavailable (day is past the ~week
 *   the forecast covers), error (message)
 * Actions: locateMe (phone location), lookUp (city or zip text), clear
 * (forget the place), retry. notice holds the last location problem to show.
 * Places are saved only on this device (see locationStore).
 */
import { useCallback, useEffect, useState } from 'react'
import type { IsoDate } from '../engine/types'
import { requestPosition } from './geolocation'
import { clearPlace, loadPlace, savePlace } from './locationStore'
import type { DayForecast, Place } from './types'
import { useWeatherService } from './useWeatherService'

export type WeatherState =
  | { status: 'needsLocation' }
  | { status: 'loading' }
  | { status: 'ready'; place: Place; forecast: DayForecast }
  | { status: 'unavailable'; place: Place }
  | { status: 'error'; place: Place; message: string }

type Outcome =
  | { kind: 'ready'; forecast: DayForecast }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong.'

export const useWeather = (date: IsoDate) => {
  const service = useWeatherService()
  const [place, setPlace] = useState<Place | undefined>(() => loadPlace())
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<string>()
  const [fetched, setFetched] = useState<{ key: string; outcome: Outcome }>()

  const key = place ? `${place.lat},${place.lon},${date},${attempt}` : undefined

  useEffect(() => {
    if (!place || !key) return
    let cancelled = false
    service
      .forecast(place, date)
      .then((forecast): Outcome =>
        forecast ? { kind: 'ready', forecast } : { kind: 'unavailable' },
      )
      .catch((error: unknown): Outcome => ({
        kind: 'error',
        message: messageOf(error),
      }))
      .then((outcome) => {
        if (!cancelled) setFetched({ key, outcome })
      })
    return () => {
      cancelled = true
    }
    // key already covers place, date and attempt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, service])

  const choose = useCallback((next: Place) => {
    savePlace(next)
    setNotice(undefined)
    setPlace(next)
  }, [])

  const locateMe = useCallback(async () => {
    try {
      choose(await requestPosition())
    } catch (error) {
      setNotice(messageOf(error))
    }
  }, [choose])

  const lookUp = useCallback(
    async (query: string) => {
      try {
        const found = await service.findPlace(query)
        if (found) choose(found)
        else setNotice("Couldn't find that place.")
      } catch (error) {
        setNotice(messageOf(error))
      }
    },
    [service, choose],
  )

  const clear = useCallback(() => {
    clearPlace()
    setNotice(undefined)
    setPlace(undefined)
  }, [])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  let state: WeatherState
  if (!place) state = { status: 'needsLocation' }
  else if (!fetched || fetched.key !== key) state = { status: 'loading' }
  else if (fetched.outcome.kind === 'ready')
    state = { status: 'ready', place, forecast: fetched.outcome.forecast }
  else if (fetched.outcome.kind === 'unavailable')
    state = { status: 'unavailable', place }
  else state = { status: 'error', place, message: fetched.outcome.message }

  return { state, notice, locateMe, lookUp, clear, retry }
}
