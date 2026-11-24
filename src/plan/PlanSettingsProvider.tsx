/**
 * PlanSettingsProvider.tsx: hands one plan's settings to the component tree.
 *
 * The app gives it the person's saved plan; screens read it with
 * usePlanSettings() instead of importing the PLAN constant.
 */
import type { ReactNode } from 'react'
import { PlanSettingsContext } from './PlanSettingsContext'
import type { PlanSettings } from './settings'

export const PlanSettingsProvider = ({
  plan,
  children,
}: {
  plan: PlanSettings
  children: ReactNode
}) => (
  <PlanSettingsContext.Provider value={plan}>
    {children}
  </PlanSettingsContext.Provider>
)
