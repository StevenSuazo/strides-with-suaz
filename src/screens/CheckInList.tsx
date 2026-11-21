/**
 * CheckInList.tsx: your most recent check-ins, with Delete.
 *
 * Ten newest first. Each line reads like "Sun, Nov 15: after a run, felt good,
 * knee (left) 2/10. Note: ...". A three-dots menu (RowMenu) offers Edit, which
 * hands the check-in to onEdit, and Delete, which asks to confirm (Confirm
 * delete or Keep check-in) before calling onDelete and shows the reason if
 * that fails.
 */
import { useState } from 'react'
import type { CheckIn, CheckInEntry } from '../engine/types'
import { AREA_LABELS, FEEL_LABELS, KIND_LABELS } from './checkInLabels'
import { formatDate } from './format'
import { RowMenu } from './RowMenu'

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
  return `${formatDate(checkIn.date)}: ${kind}, felt ${feel}, ${pain}.${note}`
}

export const CheckInList = ({
  checkIns,
  onEdit,
  onDelete,
}: {
  checkIns: CheckIn[]
  onEdit: (checkIn: CheckIn) => void
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
      <ul className="items">
        {[...checkIns]
          .sort(newestFirst)
          .slice(0, SHOWN)
          .map((checkIn) => (
            <li key={checkIn.id}>
              <span className="item-text">{describe(checkIn)}</span>
              {confirming === checkIn.id ? (
                <>
                  <button
                    type="button"
                    className="danger"
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
                <RowMenu
                  label={`Actions for ${formatDate(checkIn.date)} check-in`}
                  editLabel={`Edit ${formatDate(checkIn.date)} check-in`}
                  deleteLabel={`Delete ${formatDate(checkIn.date)} check-in`}
                  onEdit={() => onEdit(checkIn)}
                  onDelete={() => {
                    setError(undefined)
                    setConfirming(checkIn.id)
                  }}
                />
              )}
            </li>
          ))}
      </ul>
      {error && <p role="alert">{`Couldn't delete the check-in: ${error}`}</p>}
    </>
  )
}
