import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useHistoryPage } from './useHistoryPage'

const Harness = () => {
  const { open, show, hide } = useHistoryPage()
  return (
    <>
      <p>{open ? 'page open' : 'page closed'}</p>
      <button type="button" onClick={show}>
        Open
      </button>
      <button type="button" onClick={hide}>
        Close
      </button>
    </>
  )
}

afterEach(() => {
  window.history.replaceState(null, '')
})

describe('useHistoryPage', () => {
  it('starts closed', () => {
    render(<Harness />)
    expect(screen.getByText('page closed')).toBeInTheDocument()
  })

  it('opens, and adds a history entry so Back can close it', async () => {
    const before = window.history.length
    render(<Harness />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByText('page open')).toBeInTheDocument()
    expect(window.history.length).toBe(before + 1)
  })

  it('closes when the browser goes back', async () => {
    render(<Harness />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }))
    act(() => window.history.back())
    await waitFor(() =>
      expect(screen.getByText('page closed')).toBeInTheDocument(),
    )
  })

  it('closes from the Close button, and steps the history back too', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText('page closed')).toBeInTheDocument()
    await waitFor(() => expect(window.history.state?.page).toBeUndefined())
  })

  it('can open again after closing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(window.history.state?.page).toBeUndefined())
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByText('page open')).toBeInTheDocument()
  })

  it('closes quietly when there is nothing to go back to', async () => {
    render(<Harness />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText('page closed')).toBeInTheDocument()
  })

  it('stops listening when it unmounts', async () => {
    const { unmount } = render(<Harness />)
    unmount()
    expect(() =>
      act(() => window.dispatchEvent(new PopStateEvent('popstate'))),
    ).not.toThrow()
  })
})
