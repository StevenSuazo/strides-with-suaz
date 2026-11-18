import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CheckIn } from '../engine/types'
import { CheckInForm } from './CheckInForm'

const setup = (
  onSave: (checkIn: CheckIn) => Promise<void> = async () => {},
) => {
  const saved: CheckIn[] = []
  render(
    <CheckInForm
      today="2026-11-18"
      newId={() => 'new-1'}
      onSave={async (checkIn) => {
        await onSave(checkIn)
        saved.push(checkIn)
      }}
    />,
  )
  return { saved, user: userEvent.setup() }
}

const save = () => screen.getByRole('button', { name: 'Save check-in' })
const addSpot = () => screen.getByRole('button', { name: 'Add a sore spot' })
const date = () => screen.getByLabelText('Check-in date') as HTMLInputElement

describe('CheckInForm: defaults and saving', () => {
  it('starts on today, after a run, feeling good, with no sore spots', () => {
    setup()
    expect(date().value).toBe('2026-11-18')
    expect((screen.getByLabelText('When') as HTMLSelectElement).value).toBe(
      'afterRun',
    )
    expect((screen.getByLabelText('Feel') as HTMLSelectElement).value).toBe(
      'good',
    )
    expect(screen.queryByLabelText('Area 1')).not.toBeInTheDocument()
  })

  it('saves a check-in with no pain and no note', async () => {
    const { saved, user } = setup()
    await user.click(save())
    expect(saved).toEqual([
      {
        id: 'new-1',
        date: '2026-11-18',
        kind: 'afterRun',
        feel: 'good',
        entries: [],
      },
    ])
  })

  it('saves the chosen when, feel and date', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '2026-11-16' } })
    await user.selectOptions(screen.getByLabelText('When'), 'Next morning')
    await user.selectOptions(screen.getByLabelText('Feel'), 'Rough')
    await user.click(save())
    expect(saved[0]).toEqual({
      id: 'new-1',
      date: '2026-11-16',
      kind: 'nextMorning',
      feel: 'rough',
      entries: [],
    })
  })

  it('saves a trimmed note, and leaves out a blank one', async () => {
    const { saved, user } = setup()
    await user.type(screen.getByLabelText('Note'), '  tight at the end  ')
    await user.click(save())
    expect(saved[0].note).toBe('tight at the end')

    await user.clear(screen.getByLabelText('Note'))
    await user.type(screen.getByLabelText('Note'), '   ')
    await user.click(save())
    expect('note' in saved[1]).toBe(false)
  })

  it('clears the sore spots and note after saving, and says it saved', async () => {
    const { user } = setup()
    await user.click(addSpot())
    await user.type(screen.getByLabelText('Note'), 'ok')
    await user.click(save())
    expect(await screen.findByText('Check-in saved.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Area 1')).not.toBeInTheDocument()
    expect((screen.getByLabelText('Note') as HTMLTextAreaElement).value).toBe(
      '',
    )
  })
})

describe('CheckInForm: sore spots', () => {
  it('adds a spot that starts as a knee, no side, pain 1', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.click(save())
    expect(saved[0].entries).toEqual([{ area: 'knee', side: 'na', pain: 1 }])
  })

  it('saves the area, side and pain that were picked', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Area 1'), 'Shin')
    await user.selectOptions(screen.getByLabelText('Side 1'), 'Left')
    await user.selectOptions(screen.getByLabelText('Pain 1'), '4')
    await user.click(save())
    expect(saved[0].entries).toEqual([{ area: 'shin', side: 'left', pain: 4 }])
  })

  it('allows pain from 0 to 10', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Pain 1'), '10')
    await user.click(save())
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Pain 1'), '0')
    await user.click(save())
    expect(saved[0].entries[0].pain).toBe(10)
    expect(saved[1].entries[0].pain).toBe(0)
  })

  it('keeps several spots in order and removes the one you pick', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Area 1'), 'Hip')
    await user.selectOptions(screen.getByLabelText('Area 2'), 'Calf')
    await user.click(screen.getByRole('button', { name: 'Remove sore spot 1' }))
    await user.click(save())
    expect(saved[0].entries).toEqual([{ area: 'calf', side: 'na', pain: 1 }])
  })

  it('asks you to describe an Other spot, and saves the description', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Area 1'), 'Other')
    await user.click(save())
    expect(
      await screen.findByText('Describe the sore spot.'),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
    await user.type(screen.getByLabelText('Describe spot 1'), ' toe ')
    await user.click(save())
    expect(saved[0].entries).toEqual([
      { area: 'other', side: 'na', pain: 1, otherLabel: 'toe' },
    ])
  })

  it('drops the description if you switch away from Other', async () => {
    const { saved, user } = setup()
    await user.click(addSpot())
    await user.selectOptions(screen.getByLabelText('Area 1'), 'Other')
    await user.type(screen.getByLabelText('Describe spot 1'), 'toe')
    await user.selectOptions(screen.getByLabelText('Area 1'), 'Knee')
    await user.click(save())
    expect(saved[0].entries).toEqual([{ area: 'knee', side: 'na', pain: 1 }])
  })
})

describe('CheckInForm: bad input and errors', () => {
  it('rejects a missing date', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '' } })
    await user.click(save())
    expect(await screen.findByText('Pick a date.')).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('rejects a date in the future', async () => {
    const { saved, user } = setup()
    fireEvent.change(date(), { target: { value: '2026-11-19' } })
    await user.click(save())
    expect(
      await screen.findByText('That date is in the future.'),
    ).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it('shows the error and keeps what you entered when saving fails', async () => {
    const { user } = setup(async () => {
      throw new Error('offline')
    })
    await user.type(screen.getByLabelText('Note'), 'keep me')
    await user.click(save())
    expect(await screen.findByText('offline')).toBeInTheDocument()
    expect((screen.getByLabelText('Note') as HTMLTextAreaElement).value).toBe(
      'keep me',
    )
  })
})
