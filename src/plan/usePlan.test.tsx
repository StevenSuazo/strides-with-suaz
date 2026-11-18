import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { WeekResult } from '../engine/types'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import {
  emptyStorage,
  seededStorage,
  weekOne,
  weekOneRuns,
} from '../test/fixtures'
import { usePlan } from './usePlan'

const setup = (storage: AppStorage, today = '2026-11-17') =>
  renderHook(({ day }) => usePlan(day), {
    initialProps: { day: today },
    wrapper: ({ children }: { children: ReactNode }) => (
      <StorageProvider storage={storage}>{children}</StorageProvider>
    ),
  })

type Hook = ReturnType<typeof setup>['result']

const isReady = (result: Hook) => result.current.state.status === 'ready'

const view = (result: Hook) => {
  const { state } = result.current
  if (state.status !== 'ready') throw new Error('not ready yet')
  return state.view
}

describe('usePlan', () => {
  it('starts loading, then shows the plan from storage', async () => {
    const { result } = setup(await seededStorage())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(isReady(result)).toBe(true))
    expect(view(result).target?.targetMiles).toBe(9.3)
  })

  it('saves an ended week that was never saved', async () => {
    const storage = emptyStorage()
    for (const run of weekOneRuns) await storage.saveRun(run)
    const { result } = setup(storage)
    await waitFor(() => expect(isReady(result)).toBe(true))
    expect(await storage.getWeekResults()).toEqual([weekOne])
  })

  it('saves nothing when the saved weeks already match', async () => {
    const storage = await seededStorage()
    const saved: WeekResult[] = []
    const original = storage.saveWeekResult
    storage.saveWeekResult = async (week) => {
      saved.push(week)
      return original(week)
    }
    const { result } = setup(storage)
    await waitFor(() => expect(isReady(result)).toBe(true))
    expect(saved).toEqual([])
  })

  it('shows the error when storage fails', async () => {
    const storage = await seededStorage()
    storage.getRuns = async () => {
      throw new Error('offline')
    }
    const { result } = setup(storage)
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'error',
        message: 'offline',
      }),
    )
  })

  it('reloads after a run is saved, without flashing back to loading', async () => {
    const storage = await seededStorage()
    const { result } = setup(storage)
    await waitFor(() => expect(isReady(result)).toBe(true))
    expect(view(result).milesSoFar).toBe(0)

    await storage.saveRun({
      id: 'w2-run',
      date: '2026-11-17',
      miles: 3.1,
      source: 'in_app',
    })
    act(() => result.current.reload())

    expect(result.current.state.status).toBe('ready')
    await waitFor(() => expect(view(result).milesSoFar).toBe(3.1))
  })

  it('works out the plan again when the day changes', async () => {
    const { result, rerender } = setup(await seededStorage())
    await waitFor(() => expect(isReady(result)).toBe(true))
    expect(view(result).weekIndex).toBe(2)

    rerender({ day: '2026-11-23' })
    await waitFor(() => expect(view(result).weekIndex).toBe(3))
  })
})
