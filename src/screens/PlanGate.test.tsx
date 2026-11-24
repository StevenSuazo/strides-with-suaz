import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PlanSetup } from '../engine/types'
import type { PlanSettings } from '../plan/settings'
import { usePlanSettings } from '../plan/usePlanSettings'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { emptyStorage } from '../test/fixtures'
import { PlanGate } from './PlanGate'

const mine: PlanSetup = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}

const Plan = ({ onPlan }: { onPlan?: (plan: PlanSettings) => void }) => {
  const plan = usePlanSettings()
  onPlan?.(plan)
  return <p>{`The app: ${plan.startDate} for ${plan.totalWeeks} weeks`}</p>
}

const gate = (storage: AppStorage, onPlan?: (plan: PlanSettings) => void) => (
  <StorageProvider storage={storage}>
    <PlanGate today="2026-11-24">
      <Plan onPlan={onPlan} />
    </PlanGate>
  </StorageProvider>
)

describe('PlanGate', () => {
  it('shows a loading message until the plan is read', async () => {
    render(gate(emptyStorage()))
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Set up your plan' })
  })

  it('shows the app with the saved plan, and no form', async () => {
    const storage = emptyStorage()
    await storage.savePlanSetup(mine)
    render(gate(storage))
    expect(
      await screen.findByText('The app: 2026-11-09 for 19 weeks'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Set up your plan' }),
    ).not.toBeInTheDocument()
  })

  it('asks for a plan first when none is saved, and hides the app', async () => {
    render(gate(emptyStorage()))
    expect(
      await screen.findByRole('heading', { name: 'Set up your plan' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/The app/)).not.toBeInTheDocument()
  })

  it('saves the plan from the form, then shows the app using it', async () => {
    const storage = emptyStorage()
    const user = userEvent.setup()
    render(gate(storage))
    await screen.findByRole('heading', { name: 'Set up your plan' })
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-11-30' },
    })
    fireEvent.change(screen.getByLabelText('Race date'), {
      target: { value: '2027-04-18' },
    })
    await user.type(screen.getByLabelText('Starting weekly miles'), '10')
    await user.type(screen.getByLabelText('Peak weekly miles'), '25')
    await user.type(screen.getByLabelText('Starting long run (miles)'), '5')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(
      await screen.findByText('The app: 2026-11-30 for 20 weeks'),
    ).toBeInTheDocument()
    expect(await storage.getPlanSetup()).toEqual({
      startDate: '2026-11-30',
      raceDate: '2027-04-18',
      startMiles: 10,
      peakMiles: 25,
      startLongRunMiles: 5,
    })
  })

  it('shows the reason when the plan cannot be read', async () => {
    const storage: AppStorage = {
      ...emptyStorage(),
      getPlanSetup: async () => {
        throw new Error('storage: offline')
      },
    }
    render(gate(storage))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your plan: storage: offline",
    )
    expect(screen.queryByText(/The app/)).not.toBeInTheDocument()
  })

  it('hands the app the same plan object on every render', async () => {
    const storage = emptyStorage()
    await storage.savePlanSetup(mine)
    const seen: PlanSettings[] = []
    const { rerender } = render(gate(storage, (plan) => seen.push(plan)))
    await screen.findByText(/The app/)
    rerender(gate(storage, (plan) => seen.push(plan)))
    expect(seen.length).toBeGreaterThan(1)
    expect(new Set(seen).size).toBe(1)
  })
})
