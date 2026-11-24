/**
 * PlanSetupForm.tsx: sets up a training plan, or changes a saved one.
 *
 * Boxes: start date (a Monday), race date (any day, at least 8 weeks out),
 * starting weekly miles,
 * peak weekly miles and starting long run. A new plan suggests the next Monday
 * as the start and leaves everything else blank; pass `initial` to edit a
 * saved plan. Checks run as you type (readPlanDraft); a box left empty is not
 * a complaint, but Save stays off until all five are valid. When the dates are
 * valid it shows how many weeks the plan is and which day the race is on.
 * Editing adds a note that moving
 * the dates can shift past weeks. Above the form is a race search
 * (RaceSearch): picking a race fills in the race date, and for a new plan
 * suggests a start about 19 weeks before it unless the start was chosen by
 * hand; `searchRaces` swaps the lookup (for tests). It does not touch storage:
 * the parent saves through onSave, and a failed save shows its message here.
 */
import { useId, useState, type FormEvent } from 'react'
import type { IsoDate, PlanSetup } from '../engine/types'
import {
  mondayOnOrAfter,
  readPlanDraft,
  suggestStart,
  weekdayName,
  type PlanDraft,
} from '../plan/planSetup'
import type { RaceChoice } from '../races/search'
import { planFromSetup } from '../plan/settings'
import { RaceSearch } from './RaceSearch'

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
  searchRaces,
}: {
  today: IsoDate
  initial?: PlanSetup
  onSave: (setup: PlanSetup) => Promise<void>
  onCancel?: () => void
  searchRaces?: (words: string) => Promise<RaceChoice[]>
}) => {
  const id = useId()
  const [draft, setDraft] = useState<PlanDraft>(() => draftOf(today, initial))
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [pickedRace, setPickedRace] = useState<string | undefined>()
  const [startTouched, setStartTouched] = useState(false)

  const reading = readPlanDraft(draft)
  const setup = 'setup' in reading ? reading.setup : undefined
  const problem = error ?? ('problem' in reading ? reading.problem : undefined)

  const change = (field: keyof PlanDraft, value: string) => {
    setDraft({ ...draft, [field]: value })
    setError(undefined)
  }

  // Picking a race fills in its date. A new plan's start follows along (about
  // 19 weeks before it) until the start has been chosen by hand.
  const pickRace = (race: RaceChoice) => {
    setDraft({
      ...draft,
      raceDate: race.date,
      startDate:
        initial || startTouched
          ? draft.startDate
          : suggestStart(today, race.date),
    })
    setPickedRace(race.name)
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
    <>
      <RaceSearch onPick={pickRace} search={searchRaces} />
      <form onSubmit={(event) => void submit(event)} noValidate>
        <label htmlFor={`${id}-start`}>Start date</label>
        <input
          id={`${id}-start`}
          type="date"
          value={draft.startDate}
          onChange={(event) => {
            setStartTouched(true)
            change('startDate', event.target.value)
          }}
        />
        <label htmlFor={`${id}-race`}>Race date</label>
        <input
          id={`${id}-race`}
          type="date"
          value={draft.raceDate}
          onChange={(event) => {
            setPickedRace(undefined)
            change('raceDate', event.target.value)
          }}
        />
        {pickedRace && <p className="muted">{`Racing: ${pickedRace}`}</p>}
        {setup && (
          <p>{`That’s a ${planFromSetup(setup).totalWeeks}-week plan. Race day is ${weekdayName(setup.raceDate)}.`}</p>
        )}
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
    </>
  )
}
