/**
 * RunList.tsx: your most recent runs, with Edit and Delete.
 *
 * Shows the ten newest runs, newest first. Edit hands the run to onEdit.
 * Delete asks to confirm first (Confirm delete or Keep run), then calls
 * onDelete; if that fails the reason is shown. It does no storage itself.
 */
import { useState } from 'react'
import type { Run } from '../engine/types'
import { formatMiles } from './format'

const SHOWN = 10

const newestFirst = (a: Run, b: Run): number =>
  b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

export const RunList = ({
  runs,
  onEdit,
  onDelete,
}: {
  runs: Run[]
  onEdit: (run: Run) => void
  onDelete: (id: string) => Promise<void>
}) => {
  const [confirming, setConfirming] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()

  if (runs.length === 0) return <p>No runs logged yet.</p>

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
        {[...runs]
          .sort(newestFirst)
          .slice(0, SHOWN)
          .map((run) => (
            <li key={run.id}>
              <span className="item-text">{`${run.date}: ${formatMiles(run.miles)} miles${run.source === 'strava' ? ' (Strava)' : ''}`}</span>
              {confirming === run.id ? (
                <>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void confirmDelete(run.id)}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(undefined)}
                  >
                    Keep run
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label={`Edit ${run.date} run`}
                    onClick={() => onEdit(run)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${run.date} run`}
                    onClick={() => {
                      setError(undefined)
                      setConfirming(run.id)
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
      </ul>
      {error && <p role="alert">{`Couldn't delete the run: ${error}`}</p>}
    </>
  )
}
