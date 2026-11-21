/**
 * RowMenu.tsx: the three-dots button on a list row, with Edit and Delete.
 *
 * Shared by the run list and the check-in list. The button opens a small menu;
 * it closes on Escape, on a click anywhere else (so opening another row's menu
 * closes this one), and after you choose. The labels are spoken to screen
 * readers, e.g. "Actions for Sun, Nov 15 run". It does nothing itself: the
 * list decides what Edit and Delete do.
 */
import { useEffect, useRef, useState } from 'react'

export const RowMenu = ({
  label,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  label: string
  editLabel: string
  deleteLabel: string
  onEdit: () => void
  onDelete: () => void
}) => {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="run-menu" ref={box}>
      <button
        type="button"
        className="dots"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="menu">
          <button
            type="button"
            role="menuitem"
            aria-label={editLabel}
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            aria-label={deleteLabel}
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
