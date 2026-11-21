/**
 * WeatherProvider.tsx: hands a WeatherService to the screens below it.
 *
 * Optional: with no provider the real Open-Meteo service is used. Tests wrap
 * a screen in one to give it a fake service.
 */
import type { ReactNode } from 'react'
import { WeatherContext } from './WeatherContext'
import type { WeatherService } from './types'

export const WeatherProvider = ({
  service,
  children,
}: {
  service: WeatherService
  children: ReactNode
}) => (
  <WeatherContext.Provider value={service}>{children}</WeatherContext.Provider>
)
