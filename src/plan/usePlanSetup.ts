/**
 * usePlanSetup.ts: loads this person's saved plan setup.
 *
 * usePlanSetup(): { state, save }
 * - state is 'loading' until the first read, then 'missing' (nothing saved
 *   yet, so show the setup form), 'ready' with the saved setup, or 'error'
 *   with a message.
 * - save(setup) writes through storage and switches to 'ready'. If storage
 *   refuses (a RangeError for bad numbers, or an Error from the database) the
 *   state stays as it was and the error is passed on to the caller.
 */
import { useCallback, useEffect, useState } from 'react'
import type { PlanSetup } from '../engine/types'
import { useStorage } from '../storage/useStorage'

export type PlanSetupState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing' }
  | { status: 'ready'; setup: PlanSetup }

export const usePlanSetup = (): {
  state: PlanSetupState
  save: (setup: PlanSetup) => Promise<void>
} => {
  const storage = useStorage()
  const [state, setState] = useState<PlanSetupState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    storage
      .getPlanSetup()
      .then((setup) => {
        if (active) {
          setState(setup ? { status: 'ready', setup } : { status: 'missing' })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })
    return () => {
      active = false
    }
  }, [storage])

  const save = useCallback(
    async (setup: PlanSetup) => {
      await storage.savePlanSetup(setup)
      setState({ status: 'ready', setup })
    },
    [storage],
  )

  return { state, save }
}
