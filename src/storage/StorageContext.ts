/** StorageContext.ts: what StorageProvider shares with the app. */
import { createContext } from 'react'
import type { AppStorage } from './types'

export const StorageContext = createContext<AppStorage | undefined>(undefined)
