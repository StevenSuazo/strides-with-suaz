import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Run } from '../engine/types'
import { LogRunForm } from './LogRunForm'

const setup = (
  props: Partial<Parameters<typeof LogRunForm>[0]> = {},
  onSave: (run: Run) => Promise<void> = async () => {},
) => {
  const saved: Run[] = []
  render(
    <LogRunForm
      today="2026-11-18"
      newId={() => 'new-1'}
      onSave={async (run) => {
        await onSave(run)
        saved.push(run)
      }}
      {...props}
    />,
  )
  return { saved, user: userEvent.setup() }
}

const miles = () => screen.getByLabelText('Miles') as HTMLInputElement
const date = () => screen.getByLabelText('Date') as HTMLInputElement
const submit = () => screen.getByRole('button', { name: 'Log run' })

describe('LogRunForm: logging a new run', () => {
  it('starts with today’s date and empty miles', () => {
    setup()
    expect(date().value).toBe('2026-11-18')
    expect(miles().value).toBe('')
  })

  it('saves the typed miles with today’s date, a new id, and the in-app source', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '3.1')
    await user.click(submit())
    expect(saved).toEqual([
      { id: 'new-1', date: '2026-11-18', miles: 3.1, source: 'in_app' },
    ])
  })

  it('rounds the miles to hundredths', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '3.456')
    await user.click(submit())
    expect(saved[0].miles).toBe(3.46)
  })

  it('uses the date that was picked', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '2026-11-16' } })
    await user.type(miles(), '2')
    await user.click(submit())
    expect(saved[0].date).toBe('2026-11-16')
  })

  it('accepts today and the oldest sensible edge: exactly 60 miles', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '60')
    await user.click(submit())
    expect(saved).toHaveLength(1)
  })

  it('clears the miles and says it saved', async () => {
    const { user } = setup()
    await user.type(miles(), '3')
    await user.click(submit())
    expect(await screen.findByText('Run saved.')).toBeInTheDocument()
    expect(miles().value).toBe('')
  })
})

describe('LogRunForm: bad input', () => {
  it('rejects empty, zero and negative miles without saving', async () => {
    const { saved, user } = setup()
    await user.click(submit())
    expect(
      await screen.findByText('Enter the miles you ran (more than 0).'),
    ).toBeInTheDocument()
    await user.type(miles(), '0')
    await user.click(submit())
    await user.clear(miles())
    await user.type(miles(), '-2')
    await user.click(submit())
    expect(
      screen.getByText('Enter the miles you ran (more than 0).'),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('rejects more than 60 miles as a likely typo', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '61')
    await user.click(submit())
    expect(
      await screen.findByText('Miles must be 60 or less.'),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('rejects a missing date', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '' } })
    await user.type(miles(), '3')
    await user.click(submit())
    expect(await screen.findByText('Pick a date.')).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('rejects a date in the future', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '2026-11-19' } })
    await user.type(miles(), '3')
    await user.click(submit())
    expect(
      await screen.findByText('That date is in the future.'),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('shows the error and keeps the miles when saving fails', async () => {
    const { user } = setup({}, async () => {
      throw new Error('offline')
    })
    await user.type(miles(), '3')
    await user.click(submit())
    expect(await screen.findByText('offline')).toBeInTheDocument()
    expect(miles().value).toBe('3')
  })

  it('clears an old error once the next save works', async () => {
    const { user } = setup()
    await user.click(submit())
    await screen.findByText('Enter the miles you ran (more than 0).')
    await user.type(miles(), '3')
    await user.click(submit())
    expect(
      screen.queryByText('Enter the miles you ran (more than 0).'),
    ).not.toBeInTheDocument()
  })
})

describe('LogRunForm: editing a run', () => {
  const existing: Run = {
    id: 'r1',
    date: '2026-11-15',
    miles: 4.01,
    source: 'strava',
  }

  it('is filled in with the run and offers Save changes', () => {
    setup({ editing: existing })
    expect(date().value).toBe('2026-11-15')
    expect(miles().value).toBe('4.01')
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Log run' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the id and source when saving changes', async () => {
    const { saved, user } = setup({ editing: existing })
    await user.clear(miles())
    await user.type(miles(), '4.5')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(saved).toEqual([
      { id: 'r1', date: '2026-11-15', miles: 4.5, source: 'strava' },
    ])
  })

  it('calls onCancel from the Cancel button', async () => {
    let cancelled = false
    const { user } = setup({
      editing: existing,
      onCancel: () => {
        cancelled = true
      },
    })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(cancelled).toBe(true)
  })

  it('has no Cancel button when not editing', () => {
    setup()
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument()
  })
})

describe('LogRunForm: optional details', () => {
  const open = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByText('More details (optional)'))

  it('saves a plain run with no details when they are left blank', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '3')
    await user.click(submit())
    expect(saved[0]).toEqual({
      id: 'new-1',
      date: '2026-11-18',
      miles: 3,
      source: 'in_app',
    })
  })

  it('saves the time, heart rates, cadence and effort when filled in', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '3')
    await open(user)
    await user.type(screen.getByLabelText('Time'), '38:30')
    await user.type(screen.getByLabelText('Average heart rate'), '152')
    await user.type(screen.getByLabelText('Max heart rate'), '171')
    await user.type(screen.getByLabelText('Cadence'), '168')
    await user.selectOptions(screen.getByLabelText(/Effort/), '6')
    await user.click(submit())
    expect(saved[0]).toMatchObject({
      durationSeconds: 2310,
      avgHeartRate: 152,
      maxHeartRate: 171,
      cadence: 168,
      effort: 6,
    })
  })

  it('clears the details after a new run is saved', async () => {
    const { user } = setup()
    await user.type(miles(), '3')
    await open(user)
    await user.type(screen.getByLabelText('Cadence'), '168')
    await user.click(submit())
    await screen.findByText('Run saved.')
    expect((screen.getByLabelText('Cadence') as HTMLInputElement).value).toBe(
      '',
    )
  })

  it.each([
    ['Time', 'abc', 'Enter the time like 38:30 or 1:05:30.'],
    [
      'Average heart rate',
      '20',
      'Average heart rate must be a whole number from 30 to 250.',
    ],
    [
      'Max heart rate',
      '300',
      'Max heart rate must be a whole number from 30 to 250.',
    ],
    ['Cadence', '10', 'Cadence must be a whole number from 40 to 300.'],
  ])('rejects a bad %s without saving', async (label, value, message) => {
    const { saved, user } = setup()
    await user.type(miles(), '3')
    await open(user)
    await user.type(screen.getByLabelText(label), value)
    await user.click(submit())
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('rejects a max heart rate below the average', async () => {
    const { saved, user } = setup()
    await user.type(miles(), '3')
    await open(user)
    await user.type(screen.getByLabelText('Average heart rate'), '160')
    await user.type(screen.getByLabelText('Max heart rate'), '150')
    await user.click(submit())
    expect(
      await screen.findByText(
        'Max heart rate can’t be lower than the average.',
      ),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('fills in the details of a run being edited, and blanking one removes it', async () => {
    const run: Run = {
      id: 'r1',
      date: '2026-11-15',
      miles: 4,
      source: 'strava',
      durationSeconds: 2310,
      avgHeartRate: 152,
      cadence: 168,
    }
    const { saved, user } = setup({ editing: run })
    expect((screen.getByLabelText('Time') as HTMLInputElement).value).toBe(
      '38:30',
    )
    await user.clear(screen.getByLabelText('Cadence'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(saved[0]).toEqual({
      id: 'r1',
      date: '2026-11-15',
      miles: 4,
      source: 'strava',
      durationSeconds: 2310,
      avgHeartRate: 152,
    })
  })
})
