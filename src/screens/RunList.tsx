/**
 * RunList.tsx: your most recent runs, with Edit and Delete behind a menu.
 *
 * Shows the ten newest runs, newest first, each with a coloured dot and word
 * for its type (easy or long, from kinds; nothing if the type is unknown).
 * The three-dots button opens a small menu with Edit and Delete. Only one menu
 * is open at a time; it closes on Escape, on a click elsewhere, and after you
 * choose. Edit hands the run to onEdit. Delete asks to confirm first (Confirm
 * delete or Keep run), then calls onDelete; if that fails the reason is shown.
 * It does no storage itself.
 */
import { useEffect, useState } from 'react'
import type { Run, RunKind } from '../engine/types'
import { formatMiles } from './format'

const SHOWN = 10

const newestFirst = (a: Run, b: Run): number =>
  b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

export const RunList = ({
  runs,
  kinds,
  onEdit,
  onDelete,
}: {
  runs: Run[]
  kinds: Record<string, RunKind>
  onEdit: (run: Run) => void
  onDelete: (id: string) => Promise<void>
}) => {
  const [confirming, setConfirming] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [menuFor, setMenuFor] = useState<string | undefined>()

  useEffect(() => {
    if (menuFor === undefined) return
    const close = () => setMenuFor(undefined)
    const onMouseDown = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.run-menu')) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuFor])

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
            return (
              <li key={run.id}>
                {kind && (
                  <span className={`dot dot-${kind}`} aria-hidden="true" />
                )}
                <span className="item-text">{`${run.date}: ${formatMiles(run.miles)} miles${run.source === 'strava' ? ' (Strava)' : ''}`}</span>
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
                  <div className="run-menu">
                    <button
                      type="button"
                      className="dots"
                      aria-label={`Actions for ${run.date} run`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === run.id}
                      onClick={() =>
                        setMenuFor(menuFor === run.id ? undefined : run.id)
                      }
                    >
                      ⋯
                    </button>
                    {menuFor === run.id && (
                      <div role="menu" className="menu">
                        <button
                          type="button"
                          role="menuitem"
                          aria-label={`Edit ${run.date} run`}
                          onClick={() => {
                            setMenuFor(undefined)
                            onEdit(run)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="danger"
                          aria-label={`Delete ${run.date} run`}
                          onClick={() => {
                            setMenuFor(undefined)
                            setError(undefined)
                            setConfirming(run.id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
      </ul>
      {error && <p role="alert">{`Couldn't delete the run: ${error}`}</p>}
    </>
  )
}
