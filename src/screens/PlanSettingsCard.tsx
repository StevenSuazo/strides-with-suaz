/**
 * PlanSettingsCard.tsx: "Plan settings" on the More tab.
 *
 * Shows the saved plan in a line or two, with an Edit plan button that opens
 * the setup form in place (filled in, with Cancel). Saving closes it and the
 * rest of the app picks up the new plan. Shows nothing outside PlanGate.
 */
import { useContext, useState } from 'react'
import type { PlanSetup } from '../engine/types'
import { PlanSetupContext } from '../plan/PlanSetupContext'
import { planFromSetup } from '../plan/settings'
import { todayIso } from '../plan/today'
import { formatDate, formatMiles } from './format'
import { PlanSetupForm } from './PlanSetupForm'

export const PlanSettingsCard = () => {
  const controls = useContext(PlanSetupContext)
  const [editing, setEditing] = useState(false)
  if (!controls) return null
  const { setup, save } = controls

  const saveAndClose = async (next: PlanSetup) => {
    await save(next)
    setEditing(false)
  }

  return (
    <section className="card">
      <h2>Plan settings</h2>
      {editing ? (
        <PlanSetupForm
          today={todayIso()}
          initial={setup}
          onSave={saveAndClose}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p>{`${formatDate(setup.startDate)} to ${formatDate(setup.raceDate)} (${planFromSetup(setup).totalWeeks} weeks)`}</p>
          <p className="muted">{`${formatMiles(setup.startMiles)} to ${formatMiles(setup.peakMiles)} miles a week`}</p>
          <button type="button" onClick={() => setEditing(true)}>
            Edit plan
          </button>
        </>
      )}
    </section>
  )
}
