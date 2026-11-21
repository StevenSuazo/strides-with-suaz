/**
 * RunList.tsx: your most recent runs, with Edit and Delete behind a menu.
 *
 * Shows the ten newest runs, newest first, each with a coloured dot and word
 * for its type (easy or long, from kinds; nothing if the type is unknown).
 * The three-dots button (RowMenu) opens a small menu with Edit and Delete.
 * With onOpen, tapping the run's text opens its page (to see its details). Edit hands
 * the run to onEdit. Delete asks to confirm first (Confirm
 * delete or Keep run), then calls onDelete; if that fails the reason is shown.
 * It does no storage itself.
 */
import { useState } from 'react'
import type { Run, RunKind } from '../engine/types'
import { formatDate, formatMiles } from './format'
import { RowMenu } from './RowMenu'

const SHOWN = 10

const newestFirst = (a: Run, b: Run): number =>
  b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

export const RunList = ({
  runs,
  kinds,
  onEdit,
  onDelete,
  onOpen,
}: {
  runs: Run[]
  kinds: Record<string, RunKind>
  onEdit: (run: Run) => void
  onOpen?: (run: Run) => void
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
          .map((run) => {
            const kind = kinds[run.id]
            const text = `${formatDate(run.date)}: ${formatMiles(run.miles)} miles${run.source === 'strava' ? ' (Strava)' : ''}`
            return (
              <li key={run.id}>
                {kind && (
                  <span className={`dot dot-${kind}`} aria-hidden="true" />
                )}
                {onOpen ? (
                  <button
                    type="button"
                    className="item-text row-link"
                    onClick={() => onOpen(run)}
                  >
                    {text}
                  </button>
                ) : (
                  <span className="item-text">{text}</span>
                )}
                {kind && (
                  <span className="kind-label">
                    {kind === 'long' ? 'Long' : 'Easy'}
                  </span>
                )}
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
                  <RowMenu
                    label={`Actions for ${formatDate(run.date)} run`}
                    editLabel={`Edit ${formatDate(run.date)} run`}
                    deleteLabel={`Delete ${formatDate(run.date)} run`}
                    onEdit={() => onEdit(run)}
                    onDelete={() => {
                      setError(undefined)
                      setConfirming(run.id)
                    }}
                  />
                )}
              </li>
            )
          })}
      </ul>
      {error && <p role="alert">{`Couldn't delete the run: ${error}`}</p>}
    </>
  )
}
