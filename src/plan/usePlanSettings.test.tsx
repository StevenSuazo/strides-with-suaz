import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { laterPlan } from '../test/fixtures'
import { PlanSettingsProvider } from './PlanSettingsProvider'
import { PLAN } from './settings'
import { usePlanSettings } from './usePlanSettings'

describe('usePlanSettings', () => {
  it('gives the built-in plan when there is no provider', () => {
    const { result } = renderHook(() => usePlanSettings())
    expect(result.current).toEqual(PLAN)
  })

  it('gives the plan from the nearest provider', () => {
    const { result } = renderHook(() => usePlanSettings(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PlanSettingsProvider plan={laterPlan}>{children}</PlanSettingsProvider>
      ),
    })
    expect(result.current).toEqual(laterPlan)
  })
})
