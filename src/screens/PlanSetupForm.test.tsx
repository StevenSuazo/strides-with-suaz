import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PlanSetup } from '../engine/types'
import type { RaceChoice } from '../races/search'
import { PlanSetupForm } from './PlanSetupForm'

const mine: PlanSetup = {
  startDate: '2026-11-09',
  raceDate: '2027-03-21',
  startMiles: 8.5,
  peakMiles: 22,
  startLongRunMiles: 4,
}

const setup = (
  props: Partial<Parameters<typeof PlanSetupForm>[0]> = {},
  onSave: (plan: PlanSetup) => Promise<void> = async () => {},
) => {
  const saved: PlanSetup[] = []
  render(
    <PlanSetupForm
      today="2026-11-24"
      onSave={async (plan) => {
        await onSave(plan)
        saved.push(plan)
      }}
      {...props}
    />,
  )
  return { saved, user: userEvent.setup() }
}

const start = () => screen.getByLabelText('Start date') as HTMLInputElement
const race = () => screen.getByLabelText('Race date') as HTMLInputElement
const startMiles = () =>
  screen.getByLabelText('Starting weekly miles') as HTMLInputElement
const peak = () =>
  screen.getByLabelText('Peak weekly miles') as HTMLInputElement
const longRun = () =>
  screen.getByLabelText('Starting long run (miles)') as HTMLInputElement
const save = () => screen.getByRole('button', { name: 'Save plan' })

const fillAll = async (user: ReturnType<typeof userEvent.setup>) => {
  fireEvent.change(start(), { target: { value: '2026-11-09' } })
  fireEvent.change(race(), { target: { value: '2027-03-21' } })
  await user.type(startMiles(), '8.5')
  await user.type(peak(), '22')
  await user.type(longRun(), '4')
}

describe('PlanSetupForm: a new plan', () => {
  it('suggests the next Monday as the start and leaves the rest blank', () => {
    setup()
    expect(start().value).toBe('2026-11-30') // today is Tue Nov 24
    expect(race().value).toBe('')
    expect(startMiles().value).toBe('')
    expect(peak().value).toBe('')
    expect(longRun().value).toBe('')
  })

  it('keeps Save off until everything is filled in', async () => {
    const { user } = setup()
    expect(save()).toBeDisabled()
    await fillAll(user)
    expect(save()).toBeEnabled()
  })

  it('shows how many weeks the plan is', async () => {
    const { user } = setup()
    await fillAll(user)
    expect(
      screen.getByText('That’s a 19-week plan. Race day is Sunday.'),
    ).toBeInTheDocument()
  })

  it('takes a race on any day and says which day it is', async () => {
    const { saved, user } = setup()
    await fillAll(user)
    fireEvent.change(race(), { target: { value: '2027-03-20' } })
    expect(
      screen.getByText('That’s a 19-week plan. Race day is Saturday.'),
    ).toBeInTheDocument()
    await user.click(save())
    expect(saved[0].raceDate).toBe('2027-03-20')
  })

  it('saves the numbers as a plan', async () => {
    const { saved, user } = setup()
    await fillAll(user)
    await user.click(save())
    expect(saved).toEqual([mine])
  })

  it.each([
    ['a start that is not a Monday', () => start(), '2026-11-10', /Monday/],
    ['a race under 8 weeks out', () => race(), '2026-12-27', /8 weeks/],
  ])('explains %s and blocks saving', async (_n, field, value, message) => {
    const { user } = setup()
    await fillAll(user)
    fireEvent.change(field(), { target: { value } })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(save()).toBeDisabled()
    expect(screen.queryByText(/-week plan/)).not.toBeInTheDocument()
  })

  it('explains a peak that is not above the start', async () => {
    const { user } = setup()
    await fillAll(user)
    await user.clear(peak())
    await user.type(peak(), '8')
    expect(screen.getByRole('alert')).toHaveTextContent(/Peak miles/)
    expect(save()).toBeDisabled()
  })

  it('shows no complaint just because a box is still empty', () => {
    setup()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the error when saving fails, and lets the user try again', async () => {
    const { user } = setup({}, async () => {
      throw new Error('storage: offline')
    })
    await fillAll(user)
    await user.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'storage: offline',
    )
    expect(save()).toBeEnabled()
  })

  it('has no warning about moving weeks for a brand new plan', () => {
    setup()
    expect(screen.queryByText(/line up/)).not.toBeInTheDocument()
  })
})

describe('PlanSetupForm: changing a saved plan', () => {
  it('fills in the saved numbers', () => {
    setup({ initial: mine })
    expect(start().value).toBe('2026-11-09')
    expect(race().value).toBe('2027-03-21')
    expect(startMiles().value).toBe('8.5')
    expect(peak().value).toBe('22')
    expect(longRun().value).toBe('4')
  })

  it('warns that moving the dates can shift past weeks', () => {
    setup({ initial: mine })
    expect(screen.getByText(/line up/)).toBeInTheDocument()
  })

  it('saves the change', async () => {
    const { saved, user } = setup({ initial: mine })
    await user.clear(peak())
    await user.type(peak(), '24')
    await user.click(save())
    expect(saved).toEqual([{ ...mine, peakMiles: 24 }])
  })

  it('offers Cancel only when a handler is given', async () => {
    setup({ initial: mine })
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument()
  })

  it('calls onCancel', async () => {
    let cancelled = false
    const { user } = setup({
      initial: mine,
      onCancel: () => {
        cancelled = true
      },
    })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(cancelled).toBe(true)
  })
})

describe('PlanSetupForm: finding a race', () => {
  const nyc: RaceChoice = {
    id: '1',
    name: '2027 United Airlines NYC Half Marathon',
    city: 'Brooklyn',
    state: 'NY',
    date: '2027-03-21',
    url: 'https://runsignup.com/Race/1',
  }
  const later: RaceChoice = {
    ...nyc,
    id: '2',
    name: 'August Half',
    date: '2027-08-15',
  }

  const find = async (
    user: ReturnType<typeof userEvent.setup>,
    race: RaceChoice,
  ) => {
    await user.type(screen.getByLabelText('Find a half marathon'), 'half')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(
      await screen.findByRole('button', { name: new RegExp(race.name) }),
    )
  }

  it('fills in the race date from the race that was picked', async () => {
    const { user } = setup({ searchRaces: async () => [nyc] })
    await find(user, nyc)
    expect(race().value).toBe('2027-03-21')
    expect(screen.getByText(`Racing: ${nyc.name}`)).toBeInTheDocument()
  })

  it('suggests a start that gives about 19 weeks, when the start is untouched', async () => {
    const { user } = setup({ searchRaces: async () => [later] })
    await find(user, later)
    expect(start().value).toBe('2027-04-05') // 19 weeks ending in race week
  })

  it('starts on the coming Monday when 19 weeks are no longer possible', async () => {
    const { user } = setup({ searchRaces: async () => [nyc] })
    await find(user, nyc)
    expect(start().value).toBe('2026-11-30') // today is Tue Nov 24
  })

  it('keeps a start date that was chosen by hand', async () => {
    const { user } = setup({ searchRaces: async () => [later] })
    fireEvent.change(start(), { target: { value: '2027-01-04' } })
    await find(user, later)
    expect(start().value).toBe('2027-01-04')
    expect(race().value).toBe('2027-08-15')
  })

  it('leaves the saved start alone when changing a saved plan', async () => {
    const { user } = setup({ initial: mine, searchRaces: async () => [later] })
    await find(user, later)
    expect(start().value).toBe('2026-11-09')
    expect(race().value).toBe('2027-08-15')
  })

  it('saves a plan made from a picked race', async () => {
    const { saved, user } = setup({ searchRaces: async () => [nyc] })
    await find(user, nyc)
    await user.type(startMiles(), '8.5')
    await user.type(peak(), '22')
    await user.type(longRun(), '4')
    await user.click(save())
    expect(saved).toEqual([
      { ...mine, startDate: '2026-11-30', raceDate: '2027-03-21' },
    ])
  })

  it('forgets the race name when the date is changed by hand', async () => {
    const { user } = setup({ searchRaces: async () => [nyc] })
    await find(user, nyc)
    fireEvent.change(race(), { target: { value: '2027-03-28' } })
    expect(screen.queryByText(/Racing:/)).not.toBeInTheDocument()
  })

  it('does not save the plan when a race is searched for', async () => {
    const { saved, user } = setup({ searchRaces: async () => [nyc] })
    await user.type(screen.getByLabelText('Find a half marathon'), 'nyc{Enter}')
    expect(saved).toEqual([])
  })
})
