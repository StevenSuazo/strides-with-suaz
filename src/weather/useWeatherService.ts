/** useWeatherService.ts: the weather service from a provider, else the real one. */
import { useContext } from 'react'
import { WeatherContext } from './WeatherContext'
import { createOpenMeteoService } from './openMeteo'
import type { WeatherService } from './types'

const real = createOpenMeteoService()

export const useWeatherService = (): WeatherService =>
  useContext(WeatherContext) ?? real
