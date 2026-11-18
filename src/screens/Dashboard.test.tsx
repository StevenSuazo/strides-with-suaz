import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { seededStorage } from '../test/fixtures'
import { Dashboard } from './Dashboard'

const show = (storage: AppStorage) => {
  let count = 0
  render(
    <StorageProvider storage={storage}>
      <Dashboard today="2026-11-17" newId={() => `test-${++count}`} />
    </StorageProvider>,
  )
  return userEvent.setup()
}

describe('Dashboard: loading', () => {
  it('shows a loading message, then the week', async () => {
    show(await seededStorage())
    expect(screen.getByText('Loading your plan…')).toBeInTheDocument()
    expect(await screen.findByText('Week 2 of 19')).toBeInTheDocument()
    expect(screen.queryByText('Loading your plan…')).not.toBeInTheDocument()
  })

  it('shows why when the plan cannot be loaded', async () => {
    const storage = await seededStorage()
    storage.getRuns = async () => {
      throw new Error('offline')
    }
    show(storage)
    expect(
      await screen.findByText("Couldn't load your plan: offline"),
    ).toBeInTheDocument()
  })
})

describe('Dashboard: runs', () => {
  it('lists the saved runs under the week', async () => {
    show(await seededStorage())
    expect(
      await screen.findByText(/2026-11-15: 4.01 miles/),
    ).toBeInTheDocument()
    expect(screen.getByText(/2026-11-09: 2.05 miles/)).toBeInTheDocument()
  })

  it('logs a run and updates the week', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('0 of 9.3 miles so far')
    await user.type(screen.getByLabelText('Miles'), '3.1')
    await user.click(screen.getByRole('button', { name: 'Log run' }))
    expect(
      await screen.findByText('3.1 of 9.3 miles so far'),
    ).toBeInTheDocument()
    const saved = await storage.getRuns()
    expect(saved).toHaveLength(4)
    expect(saved.at(-1)).toEqual({
      id: 'test-1',
      date: '2026-11-17',
      miles: 3.1,
      source: 'in_app',
    })
  })

  it('does not save a bad run', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Week 2 of 19')
    await user.click(screen.getByRole('button', { name: 'Log run' }))
    expect(
      await screen.findByText('Enter the miles you ran (more than 0).'),
    ).toBeInTheDocument()
    expect(await storage.getRuns()).toHaveLength(3)
  })

  it('edits a run in place, without adding a duplicate', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Week 2 of 19')
    await user.click(
      screen.getByRole('button', { name: 'Edit 2026-11-15 run' }),
    )
    const miles = screen.getByLabelText('Miles') as HTMLInputElement
    expect(miles.value).toBe('4.01')
    await user.clear(miles)
    await user.type(miles, '5')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/2026-11-15: 5 miles/)).toBeInTheDocument()
    const saved = await storage.getRuns()
    expect(saved).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Log run' })).toBeInTheDocument()
  })

  it('goes back to logging a new run when you cancel an edit', async () => {
    const user = show(await seededStorage())
    await screen.findByText('Week 2 of 19')
    await user.click(
      screen.getByRole('button', { name: 'Edit 2026-11-15 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Log run' })).toBeInTheDocument()
    expect((screen.getByLabelText('Miles') as HTMLInputElement).value).toBe('')
  })

  it('deletes a run after confirming and updates the week', async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'w2',
      date: '2026-11-17',
      miles: 3,
      source: 'in_app',
    })
    const user = show(storage)
    await screen.findByText('3 of 9.3 miles so far')
    await user.click(
      screen.getByRole('button', { name: 'Delete 2026-11-17 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('0 of 9.3 miles so far')).toBeInTheDocument()
    expect(await storage.getRuns()).toHaveLength(3)
    expect(screen.queryByText(/2026-11-17: 3 miles/)).not.toBeInTheDocument()
  })

  it('changes this week’s target when an old run is fixed', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Target: 9.3 miles')
    await user.click(
      screen.getByRole('button', { name: 'Edit 2026-11-15 run' }),
    )
    const miles = screen.getByLabelText('Miles') as HTMLInputElement
    await user.clear(miles)
    await user.type(miles, '1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(screen.queryByText('Target: 9.3 miles')).not.toBeInTheDocument(),
    )
    const [week] = await storage.getWeekResults()
    expect(week.weekIndex).toBe(1)
    expect(week.actualMiles).toBe(5.55)
  })
})
