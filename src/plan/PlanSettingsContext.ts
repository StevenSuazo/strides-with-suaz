/**
 * PlanSettingsContext.ts: what PlanSettingsProvider shares with the app.
 *
 * With no provider the value is the built-in PLAN, so tests and the demo keep
 * working without setting one up.
 */
import { createContext } from 'react'
import { PLAN, type PlanSettings } from './settings'

export const PlanSettingsContext = createContext<PlanSettings>(PLAN)
