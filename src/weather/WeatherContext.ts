/** WeatherContext.ts: what WeatherProvider shares with the app. */
import { createContext } from 'react'
import type { WeatherService } from './types'

export const WeatherContext = createContext<WeatherService | undefined>(
  undefined,
)
