import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { PlanSetup } from '../engine/types'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { emptyStorage } from '../test/fixtures'
import { usePlanSetup } from './usePlanSetup'

const mine: PlanSetup = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}

const setup = (storage: AppStorage) =>
  renderHook(() => usePlanSetup(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <StorageProvider storage={storage}>{children}</StorageProvider>
    ),
  })

describe('usePlanSetup', () => {
  it('starts loading, then says missing when nothing is saved', async () => {
    const { result } = setup(emptyStorage())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('missing'))
  })

  it('is ready with the saved plan', async () => {
    const storage = emptyStorage()
    await storage.savePlanSetup(mine)
    const { result } = setup(storage)
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', setup: mine }),
    )
  })

  it('saves through storage and switches to ready', async () => {
    const storage = emptyStorage()
    const { result } = setup(storage)
    await waitFor(() => expect(result.current.state.status).toBe('missing'))
    await act(() => result.current.save(mine))
    expect(await storage.getPlanSetup()).toEqual(mine)
    expect(result.current.state).toEqual({ status: 'ready', setup: mine })
  })

  it('stays missing and passes the error on when saving fails', async () => {
    const storage = emptyStorage()
    const { result } = setup(storage)
    await waitFor(() => expect(result.current.state.status).toBe('missing'))
    await expect(
      act(() => result.current.save({ ...mine, startDate: '2026-11-10' })),
    ).rejects.toThrow(RangeError)
    expect(result.current.state.status).toBe('missing')
  })

  it('reports an error when loading fails', async () => {
    const storage: AppStorage = {
      ...emptyStorage(),
      getPlanSetup: async () => {
        throw new Error('storage: offline')
      },
    }
    const { result } = setup(storage)
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'error',
        message: 'storage: offline',
      }),
    )
  })
})
