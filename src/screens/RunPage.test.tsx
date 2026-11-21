import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Run, RunKind, Workout } from '../engine/types'
import { RunPage } from './RunPage'

const base: Run = {
  id: 'r1',
  date: '2026-11-15',
  miles: 4,
  source: 'in_app',
}

const show = (
  run: Run,
  kind?: RunKind,
  planned?: Workout,
  handlers: { onBack?: () => void; onEdit?: (run: Run) => void } = {},
) =>
  render(
    <RunPage
      run={run}
      kind={kind}
      planned={planned}
      onBack={handlers.onBack ?? (() => {})}
      onEdit={handlers.onEdit ?? (() => {})}
    />,
  )

describe('RunPage', () => {
  it('shows the date, type, miles and where it came from', () => {
    show(base, 'long')
    expect(screen.getByText('Sun, Nov 15')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Long run' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 miles')).toBeInTheDocument()
    expect(screen.getByText('Logged in the app')).toBeInTheDocument()
  })

  it('says a Strava run is from Strava', () => {
    show({ ...base, source: 'strava' }, 'easy')
    expect(screen.getByText('From Strava')).toBeInTheDocument()
  })

  it('calls an unknown type just a run', () => {
    show(base)
    expect(screen.getByRole('heading', { name: 'Run' })).toBeInTheDocument()
  })

  it('shows every detail the run has, with the pace worked out', () => {
    show(
      {
        ...base,
        durationSeconds: 2310,
        avgHeartRate: 152,
        maxHeartRate: 171,
        cadence: 168,
        effort: 6,
      },
      'easy',
    )
    expect(screen.getByText('38:30')).toBeInTheDocument()
    expect(screen.getByText('9:38 /mi')).toBeInTheDocument()
    expect(screen.queryByText('Pace')).not.toBeInTheDocument()
    expect(screen.getByText('152 bpm')).toBeInTheDocument()
    expect(screen.getByText('171 bpm')).toBeInTheDocument()
    expect(screen.getByText('168 spm')).toBeInTheDocument()
    expect(screen.getByText('6 of 10')).toBeInTheDocument()
  })

  it('leaves out details the run does not have', () => {
    show({ ...base, avgHeartRate: 150 }, 'easy')
    expect(screen.getByText('150 bpm')).toBeInTheDocument()
    expect(screen.queryByText('Cadence')).not.toBeInTheDocument()
    expect(screen.queryByText(/\/mi/)).not.toBeInTheDocument()
  })

  it('does not say there are no details when only the time is logged', () => {
    show({ ...base, durationSeconds: 2310 }, 'easy')
    expect(screen.queryByText(/No extra details yet/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Details' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('9:38 /mi')).toBeInTheDocument()
  })

  it('says how to add details when there are none', () => {
    show(base, 'easy')
    expect(screen.getByText(/No extra details yet/)).toBeInTheDocument()
  })

  it('names the planned workout it was matched to', () => {
    show(base, 'easy', {
      id: 'w2-2',
      date: '2026-11-18',
      miles: 2.3,
      kind: 'easy',
    })
    expect(
      screen.getByText('Planned: Wed, Nov 18, easy run, 2.3 miles'),
    ).toBeInTheDocument()
  })

  it('goes back and hands the run to edit', async () => {
    const onBack = vi.fn()
    const onEdit = vi.fn()
    show(base, 'easy', undefined, { onBack, onEdit })
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Edit run' }))
    expect(onEdit).toHaveBeenCalledWith(base)
  })
})

describe('RunPage: the header side', () => {
  const planned = (miles: number): Workout => ({
    id: 'w2-2',
    date: '2026-11-18',
    miles,
    kind: 'easy',
  })

  it('shows how far over the plan the run was', () => {
    show(base, 'easy', planned(3.8))
    expect(screen.getByText('+0.2 mi vs plan')).toBeInTheDocument()
  })

  it('shows how far under the plan it was', () => {
    show(base, 'easy', planned(4.5))
    expect(screen.getByText('-0.5 mi vs plan')).toBeInTheDocument()
  })

  it('says on plan when it is within a few hundredths', () => {
    show(base, 'easy', planned(4.02))
    expect(screen.getByText('On plan')).toBeInTheDocument()
  })

  it('shows nothing about the plan when there was no match', () => {
    show(base, 'easy')
    expect(screen.queryByText(/vs plan|On plan/)).not.toBeInTheDocument()
  })

  it('offers Add details when no time is logged, and it opens edit', async () => {
    const onEdit = vi.fn()
    show(base, 'easy', undefined, { onEdit })
    await userEvent.click(screen.getByRole('button', { name: 'Add details' }))
    expect(onEdit).toHaveBeenCalledWith(base)
  })

  it('does not offer Add details once a time is logged', () => {
    show({ ...base, durationSeconds: 2310 }, 'easy')
    expect(
      screen.queryByRole('button', { name: 'Add details' }),
    ).not.toBeInTheDocument()
  })
})
