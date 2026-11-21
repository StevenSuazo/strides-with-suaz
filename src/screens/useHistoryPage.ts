/**
 * useHistoryPage.ts: a page inside the app that the Back button can close.
 *
 * useHistoryPage(): { open, show, hide }
 * - show() opens the page and adds an entry to the browser's history, so the
 *   phone's Back gesture or the browser's Back button closes it instead of
 *   leaving the app.
 * - hide() closes it (the in-app Back button) and removes that history entry.
 * No router library: it only uses window.history and the popstate event.
 */
import { useCallback, useEffect, useState } from 'react'

const MARK = { page: 'sub' }

export const useHistoryPage = (): {
  open: boolean
  show: () => void
  hide: () => void
} => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onPopState = () => setOpen(window.history.state?.page === MARK.page)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const show = useCallback(() => {
    window.history.pushState(MARK, '')
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
    if (window.history.state?.page === MARK.page) window.history.back()
  }, [])

  return { open, show, hide }
}
