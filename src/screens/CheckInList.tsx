/**
 * CheckInList.tsx: your most recent check-ins, with Delete.
 *
 * Ten newest first. Each line reads like "2026-11-15: after a run, felt good,
 * knee (left) 2/10. Note: ...". Delete asks to confirm (Confirm delete or Keep
 * check-in) before calling onDelete, and shows the reason if that fails.
 */
import { useState } from 'react'
import type { CheckIn, CheckInEntry } from '../engine/types'
import { AREA_LABELS, FEEL_LABELS, KIND_LABELS } from './checkInLabels'

const SHOWN = 10

const newestFirst = (a: CheckIn, b: CheckIn): number =>
  b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

const spotText = (entry: CheckInEntry): string => {
  const name =
    entry.area === 'other'
      ? (entry.otherLabel ?? 'other')
      : AREA_LABELS[entry.area].toLowerCase()
  const side = entry.side === 'na' ? '' : ` (${entry.side})`
  return `${name}${side} ${entry.pain}/10`
}

const describe = (checkIn: CheckIn): string => {
  const kind = KIND_LABELS[checkIn.kind].toLowerCase()
  const feel = FEEL_LABELS[checkIn.feel].toLowerCase()
  const pain =
    checkIn.entries.length === 0
      ? 'no pain'
      : checkIn.entries.map(spotText).join('; ')
  const note = checkIn.note ? ` Note: ${checkIn.note}` : ''
  return `${checkIn.date}: ${kind}, felt ${feel}, ${pain}.${note}`
}

export const CheckInList = ({
  checkIns,
  onDelete,
}: {
  checkIns: CheckIn[]
  onDelete: (id: string) => Promise<void>
}) => {
  const [confirming, setConfirming] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()

  if (checkIns.length === 0) return <p>No check-ins yet.</p>

  const confirmDelete = async (id: string) => {
    try {
      await onDelete(id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setConfirming(undefined)
    }
  }

  return (
    <>
      <ul>
        {[...checkIns]
          .sort(newestFirst)
          .slice(0, SHOWN)
          .map((checkIn) => (
            <li key={checkIn.id}>
              {describe(checkIn)}
              {confirming === checkIn.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => void confirmDelete(checkIn.id)}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(undefined)}
                  >
                    Keep check-in
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  aria-label={`Delete ${checkIn.date} check-in`}
                  onClick={() => {
                    setError(undefined)
                    setConfirming(checkIn.id)
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
      </ul>
      {error && <p role="alert">{`Couldn't delete the check-in: ${error}`}</p>}
    </>
  )
}
