/**
 * usePlan.ts: loads your data and works out where the plan stands.
 *
 * usePlan(today): { state, reload }
 * - state is 'loading' until the first load, then 'ready' with a PlanView and
 *   the runs and check-ins it was built from, or 'error' with a message.
 * - Each load reads runs, check-ins and saved weeks, runs computePlan, and
 *   saves any ended weeks that are new or changed. That is how weeks close
 *   themselves. Saving twice is harmless because saves replace by week.
 * - It loads again when storage or today changes (midnight), or on reload().
 *   A reload keeps showing the old plan until the new one arrives.
 */
import { useCallback, useEffect, useState } from 'react'
import type { CheckIn, IsoDate, Run } from '../engine/types'
import { useStorage } from '../storage/useStorage'
import { computePlan, type PlanView } from './progress'

export type PlanState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; view: PlanView; runs: Run[]; checkIns: CheckIn[] }

export const usePlan = (
  today: IsoDate,
): { state: PlanState; reload: () => void } => {
  const storage = useStorage()
  const [state, setState] = useState<PlanState>({ status: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    const load = async () => {
      const [runs, checkIns, savedResults] = await Promise.all([
        storage.getRuns(),
        storage.getCheckIns(),
        storage.getWeekResults(),
      ])
      const view = computePlan({ runs, checkIns, savedResults, today })
      await Promise.all(
        view.resultsToSave.map((result) => storage.saveWeekResult(result)),
      )
      if (active) setState({ status: 'ready', view, runs, checkIns })
    }

    load().catch((error: unknown) => {
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
  }, [storage, today, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { state, reload }
}
