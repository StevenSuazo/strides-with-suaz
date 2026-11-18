/**
 * CheckInForm.tsx: record how a run, or the morning after, felt.
 *
 * Fields: date (today by default, not in the future), when (after a run or
 * next morning), feel, any number of sore spots (area, side, pain 0 to 10),
 * and an optional note. An "Other" spot needs a description. Pain from these
 * check-ins is what the weekly gate reads. It does not touch storage: the
 * parent saves through onSave.
 */
import { useId, useState, type FormEvent } from 'react'
import type {
  BodyArea,
  CheckIn,
  CheckInEntry,
  IsoDate,
  Side,
} from '../engine/types'
import {
  AREA_LABELS,
  FEEL_LABELS,
  KIND_LABELS,
  SIDE_LABELS,
} from './checkInLabels'

type Spot = { area: BodyArea; side: Side; pain: number; otherLabel: string }

const NEW_SPOT: Spot = { area: 'knee', side: 'na', pain: 1, otherLabel: '' }
const PAIN_LEVELS = Array.from({ length: 11 }, (_, level) => level)

const entriesFrom = (spots: Spot[]): CheckInEntry[] =>
  spots.map(({ area, side, pain, otherLabel }) => ({
    area,
    side,
    pain,
    ...(area === 'other' ? { otherLabel: otherLabel.trim() } : {}),
  }))

const problemWith = (
  date: string,
  spots: Spot[],
  today: IsoDate,
): string | undefined => {
  if (!date) return 'Pick a date.'
  if (date > today) return 'That date is in the future.'
  if (spots.some((s) => s.area === 'other' && s.otherLabel.trim() === '')) {
    return 'Describe the sore spot.'
  }
  return undefined
}

export const CheckInForm = ({
  today,
  newId,
  onSave,
}: {
  today: IsoDate
  newId: () => string
  onSave: (checkIn: CheckIn) => Promise<void>
}) => {
  const id = useId()
  const [date, setDate] = useState<string>(today)
  const [kind, setKind] = useState<CheckIn['kind']>('afterRun')
  const [feel, setFeel] = useState<CheckIn['feel']>('good')
  const [spots, setSpots] = useState<Spot[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const changeSpot = (index: number, change: Partial<Spot>) =>
    setSpots((all) =>
      all.map((spot, i) => (i === index ? { ...spot, ...change } : spot)),
    )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)
    const problem = problemWith(date, spots, today)
    if (problem) {
      setError(problem)
      return
    }
    setError(undefined)
    setSaving(true)
    try {
      const trimmed = note.trim()
      await onSave({
        id: newId(),
        date,
        kind,
        feel,
        entries: entriesFrom(spots),
        ...(trimmed ? { note: trimmed } : {}),
      })
      setSpots([])
      setNote('')
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor={`${id}-date`}>Check-in date</label>
      <input
        id={`${id}-date`}
        type="date"
        value={date}
        max={today}
        onChange={(event) => setDate(event.target.value)}
      />

      <label htmlFor={`${id}-kind`}>When</label>
      <select
        id={`${id}-kind`}
        value={kind}
        onChange={(event) => setKind(event.target.value as CheckIn['kind'])}
      >
        {Object.entries(KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-feel`}>Feel</label>
      <select
        id={`${id}-feel`}
        value={feel}
        onChange={(event) => setFeel(event.target.value as CheckIn['feel'])}
      >
        {Object.entries(FEEL_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {spots.map((spot, index) => {
        const n = index + 1
        return (
          <fieldset key={index}>
            <legend>{`Sore spot ${n} (pain: 0 none, 10 worst)`}</legend>
            <label htmlFor={`${id}-area-${n}`}>{`Area ${n}`}</label>
            <select
              id={`${id}-area-${n}`}
              value={spot.area}
              onChange={(event) =>
                changeSpot(index, { area: event.target.value as BodyArea })
              }
            >
              {Object.entries(AREA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-side-${n}`}>{`Side ${n}`}</label>
            <select
              id={`${id}-side-${n}`}
              value={spot.side}
              onChange={(event) =>
                changeSpot(index, { side: event.target.value as Side })
              }
            >
              {Object.entries(SIDE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-pain-${n}`}>{`Pain ${n}`}</label>
            <select
              id={`${id}-pain-${n}`}
              value={spot.pain}
              onChange={(event) =>
                changeSpot(index, { pain: Number(event.target.value) })
              }
            >
              {PAIN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            {spot.area === 'other' && (
              <>
                <label
                  htmlFor={`${id}-other-${n}`}
                >{`Describe spot ${n}`}</label>
                <input
                  id={`${id}-other-${n}`}
                  type="text"
                  value={spot.otherLabel}
                  onChange={(event) =>
                    changeSpot(index, { otherLabel: event.target.value })
                  }
                />
              </>
            )}
            <button
              type="button"
              onClick={() =>
                setSpots((all) => all.filter((_, i) => i !== index))
              }
            >
              {`Remove sore spot ${n}`}
            </button>
          </fieldset>
        )
      })}
      <button
        type="button"
        onClick={() => setSpots((all) => [...all, NEW_SPOT])}
      >
        Add a sore spot
      </button>

      <label htmlFor={`${id}-note`}>Note</label>
      <textarea
        id={`${id}-note`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <button type="submit" disabled={saving}>
        Save check-in
      </button>
      {error && <p role="alert">{error}</p>}
      {saved && <p>Check-in saved.</p>}
    </form>
  )
}
