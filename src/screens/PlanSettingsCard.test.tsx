import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PlanSetup } from '../engine/types'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { emptyStorage } from '../test/fixtures'
import { PlanGate } from './PlanGate'
import { PlanSettingsCard } from './PlanSettingsCard'

const mine: PlanSetup = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}

const show = async (storage: AppStorage = emptyStorage()) => {
  await storage.savePlanSetup(mine)
  render(
    <StorageProvider storage={storage}>
      <PlanGate today="2026-11-24">
        <PlanSettingsCard />
      </PlanGate>
    </StorageProvider>,
  )
  await screen.findByRole('heading', { name: 'Plan settings' })
  return { storage, user: userEvent.setup() }
}

const edit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Edit plan' }))

describe('PlanSettingsCard', () => {
  it('shows nothing outside the plan gate', () => {
    render(
      <StorageProvider storage={emptyStorage()}>
        <PlanSettingsCard />
      </StorageProvider>,
    )
    expect(screen.queryByText('Plan settings')).not.toBeInTheDocument()
  })

  it('summarises the saved plan', async () => {
    await show()
    expect(
      screen.getByText('Mon, Nov 9 to Sun, Mar 21 (19 weeks)'),
    ).toBeInTheDocument()
    expect(screen.getByText('8.5 to 22 miles a week')).toBeInTheDocument()
  })

  it('keeps the form closed until you ask to edit', async () => {
    await show()
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument()
  })

  it('opens the form with the saved numbers', async () => {
    const { user } = await show()
    await edit(user)
    expect((screen.getByLabelText('Race date') as HTMLInputElement).value).toBe(
      '2027-03-21',
    )
    expect(
      (screen.getByLabelText('Peak weekly miles') as HTMLInputElement).value,
    ).toBe('22')
  })

  it('closes again on Cancel without saving', async () => {
    const { storage, user } = await show()
    await edit(user)
    await user.clear(screen.getByLabelText('Peak weekly miles'))
    await user.type(screen.getByLabelText('Peak weekly miles'), '30')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument()
    expect((await storage.getPlanSetup())?.peakMiles).toBe(22)
  })

  it('saves a change, closes, and shows the new summary', async () => {
    const { storage, user } = await show()
    await edit(user)
    fireEvent.change(screen.getByLabelText('Race date'), {
      target: { value: '2027-03-28' },
    })
    await user.click(screen.getByRole('button', { name: 'Save plan' }))
    expect(
      await screen.findByText('Mon, Nov 9 to Sun, Mar 28 (20 weeks)'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument()
    expect((await storage.getPlanSetup())?.raceDate).toBe('2027-03-28')
  })

  it('stays open and shows the reason when saving fails', async () => {
    const storage = emptyStorage()
    storage.savePlanSetup = async () => {
      throw new Error('storage: offline')
    }
    const base = emptyStorage()
    await base.savePlanSetup(mine)
    storage.getPlanSetup = base.getPlanSetup
    render(
      <StorageProvider storage={storage}>
        <PlanGate today="2026-11-24">
          <PlanSettingsCard />
        </PlanGate>
      </StorageProvider>,
    )
    await screen.findByRole('heading', { name: 'Plan settings' })
    const user = userEvent.setup()
    await edit(user)
    await user.click(screen.getByRole('button', { name: 'Save plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'storage: offline',
    )
    expect(screen.getByLabelText('Start date')).toBeInTheDocument()
  })
})
