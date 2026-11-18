import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { WeekAvailability } from '../engine/types'
import { AvailabilityEditor } from './AvailabilityEditor'

const allOpen: WeekAvailability = Array(7).fill('open')
const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const setup = (
  onSave: (a: WeekAvailability) => Promise<void>,
  value = allOpen,
) => render(<AvailabilityEditor value={value} onSave={onSave} />)

describe('AvailabilityEditor', () => {
  it('shows a select for each day, Monday first, with the current values', () => {
    setup(async () => {}, [
      'open',
      'off',
      'morning',
      'open',
      'open',
      'off',
      'off',
    ])
    const values = DAYS.map(
      (d) => (screen.getByLabelText(d) as HTMLSelectElement).value,
    )
    expect(values).toEqual([
      'open',
      'off',
      'morning',
      'open',
      'open',
      'off',
      'off',
    ])
  })

  it('offers Open, Morning only and Off', () => {
    setup(async () => {})
    const select = screen.getByLabelText('Monday') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.text)).toEqual([
      'Open',
      'Morning only',
      'Off',
    ])
  })

  it('saves the changed days', async () => {
    const saved: WeekAvailability[] = []
    setup(async (a) => {
      saved.push(a)
    })
    fireEvent.change(screen.getByLabelText('Tuesday'), {
      target: { value: 'off' },
    })
    fireEvent.change(screen.getByLabelText('Friday'), {
      target: { value: 'morning' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    expect(saved).toEqual([
      ['open', 'off', 'open', 'open', 'morning', 'open', 'open'],
    ])
  })

  it('does not call onSave until you press save', () => {
    const saved: WeekAvailability[] = []
    setup(async (a) => {
      saved.push(a)
    })
    fireEvent.change(screen.getByLabelText('Tuesday'), {
      target: { value: 'off' },
    })
    expect(saved.length).toBe(0)
  })

  it('warns when every day is off and still saves', async () => {
    const saved: WeekAvailability[] = []
    setup(async (a) => {
      saved.push(a)
    }, Array(7).fill('off'))
    expect(
      screen.getByText('Every day is off, so no runs will be planned.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    expect(saved.length).toBe(1)
  })

  it('does not warn while some days are open', () => {
    setup(async () => {}, ['off', 'off', 'off', 'off', 'off', 'off', 'open'])
    expect(
      screen.queryByText('Every day is off, so no runs will be planned.'),
    ).not.toBeInTheDocument()
  })

  it('shows the reason and keeps the choices when saving fails', async () => {
    setup(async () => {
      throw new Error('offline')
    })
    fireEvent.change(screen.getByLabelText('Tuesday'), {
      target: { value: 'off' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't save availability: offline",
    )
    expect((screen.getByLabelText('Tuesday') as HTMLSelectElement).value).toBe(
      'off',
    )
    expect(screen.queryByText('Availability saved.')).not.toBeInTheDocument()
  })

  it('clears the saved message when you change a day', async () => {
    setup(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    fireEvent.change(screen.getByLabelText('Monday'), {
      target: { value: 'off' },
    })
    expect(screen.queryByText('Availability saved.')).not.toBeInTheDocument()
  })
})
