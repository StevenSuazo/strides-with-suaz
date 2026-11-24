/**
 * PlanSetupContext.ts: the saved plan setup and a way to change it.
 *
 * PlanGate provides it once a plan exists; it is undefined outside the gate
 * (tests, demo), so anything that edits the plan simply does not show there.
 */
import { createContext } from 'react'
import type { PlanSetup } from '../engine/types'

export type PlanSetupControls = {
  setup: PlanSetup
  save: (setup: PlanSetup) => Promise<void>
}

export const PlanSetupContext = createContext<PlanSetupControls | undefined>(
  undefined,
)
