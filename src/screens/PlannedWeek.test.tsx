import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { WeekAvailability, WeekTarget } from '../engine/types'
import { PlannedWeek } from './PlannedWeek'

const target: WeekTarget = { weekIndex: 2, targetMiles: 9.3, longRunMiles: 4.7 }
const allOpen: WeekAvailability = Array(7).fill('open')

const show = (availability: WeekAvailability, t: WeekTarget = target) =>
  render(
    <PlannedWeek
      target={t}
      availability={availability}
      weekStart="2026-11-16"
    />,
  )

describe('PlannedWeek', () => {
  it('lists each planned run with its day and date', () => {
    show(allOpen)
    expect(
      screen.getByText('Mon 2026-11-16: easy run, 2.3 miles'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Wed 2026-11-18: easy run, 2.3 miles'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Fri 2026-11-20: long run, 4.7 miles'),
    ).toBeInTheDocument()
  })

  it('lists runs in day order', () => {
    show(allOpen)
    const items = screen
      .getAllByRole('listitem')
      .map((li) => li.textContent?.slice(0, 3))
    expect(items).toEqual(['Mon', 'Wed', 'Fri'])
  })

  it('moves the long run when Friday is off', () => {
    show(['open', 'open', 'open', 'open', 'off', 'open', 'open'])
    expect(screen.queryByText(/Fri 2026-11-20/)).not.toBeInTheDocument()
    expect(screen.getByText(/long run, 4\.7 miles/)).toBeInTheDocument()
  })

  it('shows the planner notes', () => {
    show(['off', 'off', 'off', 'off', 'morning', 'off', 'off'], {
      weekIndex: 2,
      targetMiles: 12,
      longRunMiles: 8,
    })
    expect(
      screen.getByText(
        'The long run is cut to 6.0 miles because only a morning is free.',
      ),
    ).toBeInTheDocument()
  })

  it('says how many miles could not be placed', () => {
    show(['off', 'off', 'off', 'off', 'morning', 'off', 'off'], {
      weekIndex: 2,
      targetMiles: 20,
      longRunMiles: 10,
    })
    expect(screen.getByText(/Short by \d+(\.\d+)? miles?/)).toBeInTheDocument()
  })

  it('says so when no runs can be planned', () => {
    show(Array(7).fill('off'))
    expect(screen.getByText('No runs planned this week.')).toBeInTheDocument()
  })
})
