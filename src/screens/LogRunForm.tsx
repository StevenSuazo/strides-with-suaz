/**
 * LogRunForm.tsx: a form to log a run, or to correct one.
 *
 * Logging: date (today by default) and miles; saves a run with a new id and
 * source 'in_app'. Editing: pass the run and it fills in, keeping its id and
 * source (so a Strava run stays one). Give it a key per run so switching runs
 * resets the fields.
 * Checks before saving: a date, not in the future; miles above 0 and at most
 * 60 (a likely typo beyond that). Miles are rounded to hundredths. It does not
 * touch storage: the parent does the saving through onSave.
 */
import { useId, useState, type FormEvent } from 'react'
import type { IsoDate, Run } from '../engine/types'

const MAX_MILES = 60

const hundredths = (value: number): number => Math.round(value * 100) / 100

const problemWith = (
  date: string,
  miles: string,
  today: IsoDate,
): string | undefined => {
  if (!date) return 'Pick a date.'
  if (date > today) return 'That date is in the future.'
  const value = Number(miles)
  if (miles === '' || !Number.isFinite(value) || value <= 0) {
    return 'Enter the miles you ran (more than 0).'
  }
  if (value > MAX_MILES) return `Miles must be ${MAX_MILES} or less.`
  return undefined
}

export const LogRunForm = ({
  today,
  editing,
  newId,
  onSave,
  onCancel,
}: {
  today: IsoDate
  editing?: Run
  newId: () => string
  onSave: (run: Run) => Promise<void>
  onCancel?: () => void
}) => {
  const id = useId()
  const [date, setDate] = useState<string>(editing?.date ?? today)
  const [miles, setMiles] = useState(editing ? String(editing.miles) : '')
  const [error, setError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)
    const problem = problemWith(date, miles, today)
    if (problem) {
      setError(problem)
      return
    }
    setError(undefined)
    setSaving(true)
    try {
      await onSave({
        id: editing?.id ?? newId(),
        date,
        miles: hundredths(Number(miles)),
        source: editing?.source ?? 'in_app',
      })
      if (!editing) {
        setMiles('')
        setSaved(true)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor={`${id}-date`}>Date</label>
      <input
        id={`${id}-date`}
        type="date"
        value={date}
        max={today}
        onChange={(event) => setDate(event.target.value)}
      />
      <label htmlFor={`${id}-miles`}>Miles</label>
      <input
        id={`${id}-miles`}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={miles}
        onChange={(event) => setMiles(event.target.value)}
      />
      <button type="submit" disabled={saving}>
        {editing ? 'Save changes' : 'Log run'}
      </button>
      {editing && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {saved && <p>Run saved.</p>}
    </form>
  )
}
