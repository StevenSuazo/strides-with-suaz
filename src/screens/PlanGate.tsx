/**
 * PlanGate.tsx: shows the app only once this person has a plan.
 *
 * Loading: a short message. Error: the reason. No plan saved yet: the setup
 * form (their first run of the app). A saved plan: the app, with the plan
 * shared through PlanSettingsProvider and the way to change it through
 * PlanSetupContext. The plan object is rebuilt only when the saved setup
 * changes, so screens do not reload on every render. Must sit inside a
 * StorageProvider and LoginGate.
 */
import { useMemo, type ReactNode } from 'react'
import type { IsoDate } from '../engine/types'
import { PlanSettingsProvider } from '../plan/PlanSettingsProvider'
import { PlanSetupContext } from '../plan/PlanSetupContext'
import { planFromSetup } from '../plan/settings'
import { todayIso } from '../plan/today'
import { usePlanSetup } from '../plan/usePlanSetup'
import { PlanSetupForm } from './PlanSetupForm'

export const PlanGate = ({
  today = todayIso(),
  children,
}: {
  today?: IsoDate
  children: ReactNode
}) => {
  const { state, save } = usePlanSetup()
  const setup = state.status === 'ready' ? state.setup : undefined
  const plan = useMemo(
    () => (setup ? planFromSetup(setup) : undefined),
    [setup],
  )
  const controls = useMemo(
    () => (setup ? { setup, save } : undefined),
    [setup, save],
  )

  if (state.status === 'loading') return <p>Loading…</p>

  if (state.status === 'error') {
    return <p role="alert">{`Couldn't load your plan: ${state.message}`}</p>
  }

  if (state.status === 'missing') {
    return (
      <section className="card">
        <h2>Set up your plan</h2>
        <p className="muted">
          Pick your start date, race date and weekly miles. You can change these
          later under More.
        </p>
        <PlanSetupForm today={today} onSave={save} />
      </section>
    )
  }

  return (
    <PlanSetupContext.Provider value={controls}>
      <PlanSettingsProvider plan={plan!}>{children}</PlanSettingsProvider>
    </PlanSetupContext.Provider>
  )
}
