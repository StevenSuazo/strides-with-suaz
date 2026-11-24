/**
 * PlanSetupForm.tsx: sets up a training plan, or changes a saved one.
 *
 * Boxes: start date (a Monday), race date (a Sunday), starting weekly miles,
 * peak weekly miles and starting long run. A new plan suggests the next Monday
 * as the start and leaves everything else blank; pass `initial` to edit a
 * saved plan. Checks run as you type (readPlanDraft); a box left empty is not
 * a complaint, but Save stays off until all five are valid. When the dates are
 * valid it shows how many weeks the plan is. Editing adds a note that moving
 * the dates can shift past weeks. It does not touch storage: the parent saves
 * through onSave, and a failed save shows its message here.
 */
import { useId, useState, type FormEvent } from 'react'
import type { IsoDate, PlanSetup } from '../engine/types'
import {
  mondayOnOrAfter,
  readPlanDraft,
  type PlanDraft,
} from '../plan/planSetup'
import { planFromSetup } from '../plan/settings'

const draftOf = (today: IsoDate, initial?: PlanSetup): PlanDraft =>
  initial
    ? {
        startDate: initial.startDate,
        raceDate: initial.raceDate,
        startMiles: String(initial.startMiles),
        peakMiles: String(initial.peakMiles),
        startLongRunMiles: String(initial.startLongRunMiles),
      }
    : {
        startDate: mondayOnOrAfter(today),
        raceDate: '',
        startMiles: '',
        peakMiles: '',
        startLongRunMiles: '',
      }

export const PlanSetupForm = ({
  today,
  initial,
  onSave,
  onCancel,
}: {
  today: IsoDate
  initial?: PlanSetup
  onSave: (setup: PlanSetup) => Promise<void>
  onCancel?: () => void
}) => {
  const id = useId()
  const [draft, setDraft] = useState<PlanDraft>(() => draftOf(today, initial))
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const reading = readPlanDraft(draft)
  const setup = 'setup' in reading ? reading.setup : undefined
  const problem = error ?? ('problem' in reading ? reading.problem : undefined)

  const change = (field: keyof PlanDraft, value: string) => {
    setDraft({ ...draft, [field]: value })
    setError(undefined)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!setup) return
    setSaving(true)
    try {
      await onSave(setup)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor={`${id}-start`}>Start date</label>
      <input
        id={`${id}-start`}
        type="date"
        value={draft.startDate}
        onChange={(event) => change('startDate', event.target.value)}
      />
      <label htmlFor={`${id}-race`}>Race date</label>
      <input
        id={`${id}-race`}
        type="date"
        value={draft.raceDate}
        onChange={(event) => change('raceDate', event.target.value)}
      />
      {setup && <p>That’s a {planFromSetup(setup).totalWeeks}-week plan.</p>}
      <label htmlFor={`${id}-start-miles`}>Starting weekly miles</label>
      <input
        id={`${id}-start-miles`}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={draft.startMiles}
        onChange={(event) => change('startMiles', event.target.value)}
      />
      <label htmlFor={`${id}-peak`}>Peak weekly miles</label>
      <input
        id={`${id}-peak`}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={draft.peakMiles}
        onChange={(event) => change('peakMiles', event.target.value)}
      />
      <label htmlFor={`${id}-long-run`}>Starting long run (miles)</label>
      <input
        id={`${id}-long-run`}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={draft.startLongRunMiles}
        onChange={(event) => change('startLongRunMiles', event.target.value)}
      />
      {initial && (
        <p className="muted">
          Changing the dates after you’ve started can move your weeks, so past
          results may not line up.
        </p>
      )}
      <button type="submit" disabled={!setup || saving}>
        Save plan
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
      {problem && <p role="alert">{problem}</p>}
    </form>
  )
}
