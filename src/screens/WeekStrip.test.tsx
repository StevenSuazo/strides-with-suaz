import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlannedRun, Run } from '../engine/types'
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

const show = (runs: Run[] = [], today = '2026-11-17', plan = planned) => {
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
