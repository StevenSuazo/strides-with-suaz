/** usePlanSettings.ts: the plan's settings, from the nearest provider (else PLAN). */
import { useContext } from 'react'
import { PlanSettingsContext } from './PlanSettingsContext'
import type { PlanSettings } from './settings'

export const usePlanSettings = (): PlanSettings =>
  useContext(PlanSettingsContext)
