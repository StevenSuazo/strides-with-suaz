import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PlannedRun, Run } from '../engine/types'
import { PlanSettingsProvider } from '../plan/PlanSettingsProvider'
import { PLAN } from '../plan/settings'
import { matchWeek } from '../plan/weekMatch'
import { WeekStrip } from './WeekStrip'

const planned: PlannedRun[] = [
  { dayIndex: 0, kind: 'easy', miles: 2.3 },
  { dayIndex: 2, kind: 'easy', miles: 2.3 },
  { dayIndex: 4, kind: 'long', miles: 4.7 },
]
const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})

const show = (
  runs: Run[] = [],
  today = '2026-11-17',
  plan = planned,
  onOpenRun?: (run: Run) => void,
) => {
  const { rows, extraRuns } = matchWeek({
    weekIndex: 2,
    weekStart: '2026-11-16',
    planned: plan,
    runs,
    overrides: {},
    today,
  })
  return render(
    <WeekStrip
      weekStart="2026-11-16"
      rows={rows}
      extraRuns={extraRuns}
      today={today}
      onOpenRun={onOpenRun}
    />,
  )
}

const day = (name: RegExp) => screen.getByRole('group', { name })

describe('WeekStrip', () => {
  it('shows Monday to Sunday with their dates', () => {
    show()
    expect(
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(
        (d) => screen.getByText(d).textContent,
      ),
    ).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
    expect(
      ['16', '17', '18', '19', '20', '21', '22'].every((d) =>
        screen.getByText(d),
      ),
    ).toBe(true)
  })

  it('marks today', () => {
    show()
    expect(day(/Tue, Nov 17/).getAttribute('aria-current')).toBe('date')
    expect(day(/Mon, Nov 16/).getAttribute('aria-current')).toBeNull()
  })

  it('marks nothing when today is outside the week', () => {
    show([], '2026-11-30')
    expect(document.querySelector('[aria-current]')).toBeNull()
  })

  it('shows the planned miles on planned days only', () => {
    show()
    expect(day(/Wed, Nov 18/).textContent).toContain('2.3')
    expect(day(/Fri, Nov 20/).textContent).toContain('4.7')
    expect(day(/Thu, Nov 19/).textContent).not.toMatch(/\d\.\d/)
  })

  it('describes each day in words', () => {
    show()
    expect(day(/Fri, Nov 20/).getAttribute('aria-label')).toBe(
      'Fri, Nov 20: long run, 4.7 miles planned, coming up',
    )
    expect(day(/Thu, Nov 19/).getAttribute('aria-label')).toBe(
      'Thu, Nov 19: no run planned',
    )
  })

  it('shows a done day with a check and the miles run', () => {
    show([run('a', '2026-11-16', 2.5)])
    expect(day(/Mon, Nov 16/).textContent).toContain('✓')
    expect(day(/Mon, Nov 16/).textContent).toContain('2.5')
    expect(day(/Mon, Nov 16/).getAttribute('aria-label')).toBe(
      'Mon, Nov 16: easy run, 2.3 miles planned, done: ran 2.5 miles',
    )
  })

  it('shows a missed day', () => {
    show()
    expect(day(/Mon, Nov 16/).getAttribute('aria-label')).toBe(
      'Mon, Nov 16: easy run, 2.3 miles planned, missed',
    )
    expect(day(/Mon, Nov 16/).className).toContain('missed')
    expect(day(/Wed, Nov 18/).className).not.toContain('missed')
  })

  it('tells easy runs from long runs', () => {
    show()
    expect(day(/Wed, Nov 18/).querySelector('.dot-easy')).not.toBeNull()
    expect(day(/Fri, Nov 20/).querySelector('.dot-long')).not.toBeNull()
    expect(day(/Thu, Nov 19/).querySelector('.dot')).toBeNull()
  })

  it('shows an extra run on an unplanned day', () => {
    show([run('x', '2026-11-21', 3.25)])
    expect(day(/Sat, Nov 21/).getAttribute('aria-label')).toBe(
      'Sat, Nov 21: extra run, 3.25 miles',
    )
    expect(day(/Sat, Nov 21/).textContent).toContain('3.25')
  })

  it('shows an empty week with no dots', () => {
    show([], '2026-11-17', [])
    expect(document.querySelectorAll('.dot').length).toBe(0)
  })
})

describe('WeekStrip: opening a run', () => {
  it('makes a done day tappable and hands over its run', async () => {
    const opened: Run[] = []
    show([run('r1', '2026-11-16', 2.4)], '2026-11-17', planned, (r) =>
      opened.push(r),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Run details for Mon, Nov 16' }),
    )
    expect(opened.map((r) => r.id)).toEqual(['r1'])
  })

  it('makes an extra-run day tappable too', async () => {
    const opened: Run[] = []
    show([run('x1', '2026-11-21', 3)], '2026-11-22', planned, (r) =>
      opened.push(r),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Run details for Sat, Nov 21' }),
    )
    expect(opened.map((r) => r.id)).toEqual(['x1'])
  })

  it('has no buttons for planned days without a run', () => {
    show([], '2026-11-17', planned, () => {})
    expect(screen.queryAllByRole('button')).toEqual([])
  })

  it('has no buttons at all without a handler', () => {
    show([run('r1', '2026-11-16', 2.4)])
    expect(screen.queryAllByRole('button')).toEqual([])
  })
})

describe('WeekStrip: race day', () => {
  // Race week of the built-in plan: Mon Mar 15 to Sun Mar 21, 2027.
  const showRaceWeek = (
    runs: Run[] = [],
    raceDate = PLAN.raceDate,
    weekStart = '2027-03-15',
  ) => {
    const { rows, extraRuns } = matchWeek({
      weekIndex: 19,
      weekStart,
      planned: [], // nothing planned, so a logged run stays an extra one
      runs,
      overrides: {},
      today: '2027-03-15',
    })
    return render(
      <PlanSettingsProvider plan={{ ...PLAN, raceDate }}>
        <WeekStrip
          weekStart={weekStart}
          rows={rows}
          extraRuns={extraRuns}
          today="2027-03-15"
        />
      </PlanSettingsProvider>,
    )
  }

  it('marks race day, with the word Race and a plain-words label', () => {
    showRaceWeek()
    const day = screen.getByRole('group', { name: 'Sun, Mar 21: race day' })
    expect(day).toHaveTextContent('Race')
    expect(day).toHaveClass('race')
  })

  it('marks a race on any day of the week', () => {
    showRaceWeek([], '2027-03-19')
    expect(
      screen.getByRole('group', { name: 'Fri, Mar 19: race day' }),
    ).toHaveTextContent('Race')
    expect(
      screen.getByRole('group', { name: 'Sun, Mar 21: no run planned' }),
    ).not.toHaveTextContent('Race')
  })

  it('shows only one race day', () => {
    showRaceWeek()
    expect(screen.getAllByText('Race')).toHaveLength(1)
  })

  it('keeps a run logged on race day, and still says it is race day', () => {
    showRaceWeek([run('r1', '2027-03-21', 13.1)])
    const day = screen.getByRole('group', {
      name: 'Sun, Mar 21: extra run, 13.1 miles, race day',
    })
    expect(day).toHaveTextContent('13.1')
    expect(day).not.toHaveTextContent('Race')
    expect(day).toHaveClass('race')
  })

  it('marks nothing in a week that is not race week', () => {
    showRaceWeek([], PLAN.raceDate, '2027-03-08')
    expect(screen.queryByText('Race')).not.toBeInTheDocument()
  })
})
