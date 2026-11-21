/**
 * LogRunForm.tsx: a form to log a run, or to correct one.
 *
 * Logging: date (today by default) and miles; saves a run with a new id and
 * source 'in_app'. Under "More details (optional)": time (38:30, 1:05:30 or
 * minutes), average and max heart rate, cadence and effort 1 to 10. A blank
 * box leaves that detail out; editing and blanking one removes it. Editing: pass the run and it fills in, keeping its id and
 * source (so a Strava run stays one). Give it a key per run so switching runs
 * resets the fields.
 * Checks before saving: a date, not in the future; miles above 0 and at most
 * 60 (a likely typo beyond that); details, if given, must be whole numbers in
 * range (RUN_LIMITS), a real time, and max heart rate not below the average.
 * Miles are rounded to hundredths. It does not
 * touch storage: the parent does the saving through onSave.
 */
import { useId, useState, type FormEvent } from 'react'
import type { IsoDate, Run } from '../engine/types'
import { RUN_LIMITS } from '../storage/validate'
import { formatDuration, parseDuration } from './duration'

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

type Details = Pick<
  Run,
  'durationSeconds' | 'avgHeartRate' | 'maxHeartRate' | 'cadence' | 'effort'
>

type DetailText = {
  time: string
  avg: string
  max: string
  cadence: string
  effort: string
}

// A box left blank is undefined (leave it out); a bad entry is an error text.
const wholeNumberIn = (
  text: string,
  name: string,
  limit: { min: number; max: number },
): number | undefined | string => {
  if (text.trim() === '') return undefined
  const value = Number(text)
  if (!Number.isInteger(value) || value < limit.min || value > limit.max) {
    return `${name} must be a whole number from ${limit.min} to ${limit.max}.`
  }
  return value
}

const readDetails = (text: DetailText): Details | string => {
  const seconds = parseDuration(text.time)
  if (
    seconds === null ||
    (seconds !== undefined &&
      (seconds < RUN_LIMITS.durationSeconds.min ||
        seconds > RUN_LIMITS.durationSeconds.max))
  ) {
    return 'Enter the time like 38:30 or 1:05:30.'
  }
  const avg = wholeNumberIn(
    text.avg,
    'Average heart rate',
    RUN_LIMITS.heartRate,
  )
  const max = wholeNumberIn(text.max, 'Max heart rate', RUN_LIMITS.heartRate)
  const cadence = wholeNumberIn(text.cadence, 'Cadence', RUN_LIMITS.cadence)
  const effort = wholeNumberIn(text.effort, 'Effort', RUN_LIMITS.effort)
  for (const value of [avg, max, cadence, effort]) {
    if (typeof value === 'string') return value
  }
  if (typeof avg === 'number' && typeof max === 'number' && max < avg) {
    return 'Max heart rate can’t be lower than the average.'
  }
  return {
    ...(seconds === undefined ? {} : { durationSeconds: seconds }),
    ...(avg === undefined ? {} : { avgHeartRate: avg as number }),
    ...(max === undefined ? {} : { maxHeartRate: max as number }),
    ...(cadence === undefined ? {} : { cadence: cadence as number }),
    ...(effort === undefined ? {} : { effort: effort as number }),
  }
}

const textOf = (run?: Run): DetailText => ({
  time: run?.durationSeconds ? formatDuration(run.durationSeconds) : '',
  avg: run?.avgHeartRate === undefined ? '' : String(run.avgHeartRate),
  max: run?.maxHeartRate === undefined ? '' : String(run.maxHeartRate),
  cadence: run?.cadence === undefined ? '' : String(run.cadence),
  effort: run?.effort === undefined ? '' : String(run.effort),
})

const EMPTY_DETAILS: DetailText = textOf()

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
  const [details, setDetails] = useState<DetailText>(() => textOf(editing))
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
    const read = readDetails(details)
    if (typeof read === 'string') {
      setError(read)
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
        ...read,
      })
      if (!editing) {
        setMiles('')
        setDetails(EMPTY_DETAILS)
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
      <details open={Object.values(textOf(editing)).some(Boolean) || undefined}>
        <summary>More details (optional)</summary>
        <label htmlFor={`${id}-time`}>Time</label>
        <input
          id={`${id}-time`}
          placeholder="38:30 or 1:05:30"
          value={details.time}
          onChange={(event) =>
            setDetails({ ...details, time: event.target.value })
          }
        />
        <label htmlFor={`${id}-avg`}>Average heart rate</label>
        <input
          id={`${id}-avg`}
          type="number"
          inputMode="numeric"
          value={details.avg}
          onChange={(event) =>
            setDetails({ ...details, avg: event.target.value })
          }
        />
        <label htmlFor={`${id}-max`}>Max heart rate</label>
        <input
          id={`${id}-max`}
          type="number"
          inputMode="numeric"
          value={details.max}
          onChange={(event) =>
            setDetails({ ...details, max: event.target.value })
          }
        />
        <label htmlFor={`${id}-cadence`}>Cadence</label>
        <input
          id={`${id}-cadence`}
          type="number"
          inputMode="numeric"
          value={details.cadence}
          onChange={(event) =>
            setDetails({ ...details, cadence: event.target.value })
          }
        />
        <label htmlFor={`${id}-effort`}>Effort (1 easy, 10 all out)</label>
        <select
          id={`${id}-effort`}
          value={details.effort}
          onChange={(event) =>
            setDetails({ ...details, effort: event.target.value })
          }
        >
          <option value="">Not set</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={String(index + 1)}>
              {index + 1}
            </option>
          ))}
        </select>
      </details>
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
