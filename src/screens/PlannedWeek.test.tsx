import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Run, WeekAvailability, WeekTarget } from '../engine/types'
import { PlannedWeek } from './PlannedWeek'

const target: WeekTarget = { weekIndex: 2, targetMiles: 9.3, longRunMiles: 4.7 }
const allOpen: WeekAvailability = Array(7).fill('open')
const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})

const show = (
  availability: WeekAvailability,
  extra: {
    target?: WeekTarget
    runs?: Run[]
    today?: string
    overrides?: Record<string, string>
    onMatch?: (workoutId: string, runId: string) => Promise<void>
    onUnmatch?: (runId: string) => Promise<void>
  } = {},
) =>
  render(
    <PlannedWeek
      target={extra.target ?? target}
      availability={availability}
      weekStart="2026-11-16"
      today={extra.today ?? '2026-11-17'}
      runs={extra.runs ?? []}
      overrides={extra.overrides ?? {}}
      onMatch={extra.onMatch ?? (async () => {})}
      onUnmatch={extra.onUnmatch ?? (async () => {})}
    />,
  )

describe('PlannedWeek: the plan', () => {
  it('lists each planned run with its day and date', () => {
    show(allOpen)
    expect(
      screen.getByText('Mon, Nov 16: easy run, 2.3 miles'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Wed, Nov 18: easy run, 2.3 miles'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Fri, Nov 20: long run, 4.7 miles'),
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
    expect(screen.queryByText(/Fri, Nov 20/)).not.toBeInTheDocument()
    expect(screen.getByText(/long run, 4\.7 miles/)).toBeInTheDocument()
  })

  it('shows the planner notes', () => {
    show(['off', 'off', 'off', 'off', 'morning', 'off', 'off'], {
      target: { weekIndex: 2, targetMiles: 12, longRunMiles: 8 },
    })
    expect(
      screen.getByText(
        'The long run is cut to 6.0 miles because only a morning is free.',
      ),
    ).toBeInTheDocument()
  })

  it('says how many miles could not be placed', () => {
    show(['off', 'off', 'off', 'off', 'morning', 'off', 'off'], {
      target: { weekIndex: 2, targetMiles: 20, longRunMiles: 10 },
    })
    expect(screen.getByText(/Short by \d+(\.\d+)? miles?/)).toBeInTheDocument()
  })

  it('says so when no runs can be planned', () => {
    show(Array(7).fill('off'))
    expect(screen.getByText('No runs planned this week.')).toBeInTheDocument()
  })
})

describe('PlannedWeek: done, missed and coming up', () => {
  it('shows done with the miles actually run', () => {
    show(allOpen, { runs: [run('a', '2026-11-16', 2.5)] })
    expect(screen.getByText('Done: ran 2.5 miles')).toBeInTheDocument()
  })

  it('shows missed for a past day with no run', () => {
    show(allOpen)
    expect(screen.getAllByText('Missed').length).toBe(1)
  })

  it('shows coming up for today and later days', () => {
    show(allOpen)
    expect(screen.getAllByText('Coming up').length).toBe(2)
  })

  it('lists extra runs that matched nothing', () => {
    show(allOpen, { runs: [run('x', '2026-11-21', 3.25)] })
    expect(
      screen.getByRole('heading', { name: 'Extra runs' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('listitem').map((li) => li.textContent),
    ).toContain('Sat, Nov 21: 3.25 miles')
  })

  it('has no extra runs heading when everything matched', () => {
    show(allOpen, { runs: [run('a', '2026-11-16', 2.5)] })
    expect(
      screen.queryByRole('heading', { name: 'Extra runs' }),
    ).not.toBeInTheDocument()
  })
})

describe('PlannedWeek: matching by hand', () => {
  it('has no match dropdowns when there are no runs this week', () => {
    show(allOpen)
    expect(
      screen.queryByLabelText('Run for Mon, Nov 16'),
    ).not.toBeInTheDocument()
  })

  it("offers this week's runs and shows the matched one", () => {
    show(allOpen, {
      runs: [run('a', '2026-11-16', 2.5), run('b', '2026-11-21', 3)],
    })
    const select = screen.getByLabelText(
      'Run for Mon, Nov 16',
    ) as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.text)).toEqual([
      'Match to…',
      'Mon, Nov 16: 2.5 miles',
      'Sat, Nov 21: 3 miles',
    ])
    expect(select.value).toBe('a')
    expect(
      (screen.getByLabelText('Run for Wed, Nov 18') as HTMLSelectElement).value,
    ).toBe('')
  })

  it('calls onMatch with the workout and run when you pick one', async () => {
    const calls: [string, string][] = []
    show(allOpen, {
      runs: [run('b', '2026-11-21', 3)],
      onMatch: async (w, r) => {
        calls.push([w, r])
      },
    })
    fireEvent.change(screen.getByLabelText('Run for Wed, Nov 18'), {
      target: { value: 'b' },
    })
    await screen.findByLabelText('Run for Wed, Nov 18')
    expect(calls).toEqual([['w2-2', 'b']])
  })

  it('shows the reason when matching fails', async () => {
    show(allOpen, {
      runs: [run('b', '2026-11-21', 3)],
      onMatch: async () => {
        throw new Error('offline')
      },
    })
    fireEvent.change(screen.getByLabelText('Run for Wed, Nov 18'), {
      target: { value: 'b' },
    })
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't match the run: offline",
    )
  })
})

describe('PlannedWeek: undoing a hand match', () => {
  const runs = [run('a', '2026-11-16', 2.5), run('b', '2026-11-21', 3)]
  const options = (label: string) =>
    Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map(
      (o) => o.text,
    )

  it('offers "Let the app decide" only on a hand-matched run', () => {
    show(allOpen, { runs, overrides: { a: 'w2-0' } })
    expect(options('Run for Mon, Nov 16')).toContain('Let the app decide')
    expect(options('Run for Wed, Nov 18')).not.toContain('Let the app decide')
  })

  it('does not offer it for a match the app made itself', () => {
    show(allOpen, { runs })
    expect(options('Run for Mon, Nov 16')).not.toContain('Let the app decide')
  })

  it('does not offer it when the override points at another workout', () => {
    show(allOpen, { runs, overrides: { a: 'w2-2' } })
    expect(options('Run for Mon, Nov 16')).not.toContain('Let the app decide')
  })

  it('calls onUnmatch with the run id when you choose it', async () => {
    const calls: string[] = []
    show(allOpen, {
      runs,
      overrides: { a: 'w2-0' },
      onUnmatch: async (id) => {
        calls.push(id)
      },
    })
    fireEvent.change(screen.getByLabelText('Run for Mon, Nov 16'), {
      target: { value: '__auto' },
    })
    await screen.findByLabelText('Run for Mon, Nov 16')
    expect(calls).toEqual(['a'])
  })

  it('shows the reason when undoing fails', async () => {
    show(allOpen, {
      runs,
      overrides: { a: 'w2-0' },
      onUnmatch: async () => {
        throw new Error('offline')
      },
    })
    fireEvent.change(screen.getByLabelText('Run for Mon, Nov 16'), {
      target: { value: '__auto' },
    })
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't undo the match: offline",
    )
  })
})
