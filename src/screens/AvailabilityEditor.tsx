/**
 * AvailabilityEditor.tsx: pick which days you can run this week.
 *
 * One select per day, Monday first: Open, Morning only, or Off. Nothing is
 * saved until you press the button; the parent saves through onSave. Use a
 * key to reset it when the saved value changes.
 */
import { useId, useState } from 'react'
import type { DayAvailability, WeekAvailability } from '../engine/types'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const OPTIONS: [DayAvailability, string][] = [
  ['open', 'Open'],
  ['morning', 'Morning only'],
  ['off', 'Off'],
]

export const AvailabilityEditor = ({
  value,
  onSave,
}: {
  value: WeekAvailability
  onSave: (availability: WeekAvailability) => Promise<void>
}) => {
  const id = useId()
  const [days, setDays] = useState<WeekAvailability>(value)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const change = (index: number, next: DayAvailability) => {
    setDays((all) => all.map((day, i) => (i === index ? next : day)))
    setSaved(false)
  }

  const save = async () => {
    setSaved(false)
    setError(undefined)
    try {
      await onSave(days)
      setSaved(true)
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : String(caught)
      setError(`Couldn't save availability: ${reason}`)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      {DAYS.map((name, index) => (
        <div key={name}>
          <label htmlFor={`${id}-${index}`}>{name}</label>
          <select
            id={`${id}-${index}`}
            value={days[index]}
            onChange={(event) =>
              change(index, event.target.value as DayAvailability)
            }
          >
            {OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {days.every((day) => day === 'off') && (
        <p>Every day is off, so no runs will be planned.</p>
      )}
      <button type="submit">Save availability</button>
      {error && <p role="alert">{error}</p>}
      {saved && <p>Availability saved.</p>}
    </form>
  )
}
