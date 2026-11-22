import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Run } from '../engine/types'
import { computePlan } from '../plan/progress'
import { matchWeek } from '../plan/weekMatch'
import { StorageProvider } from '../storage/StorageProvider'
import { emptyStorage, weekOneRuns } from '../test/fixtures'
import { WeekPager } from './WeekPager'

const show = (
  today: string,
  weekStart: string,
  weekIndex: number,
  runs: Run[] = weekOneRuns,
  onOpenRun: (run: Run) => void = () => {},
) => {
  const view = computePlan({ runs, checkIns: [], savedResults: [], today })
  const { rows, extraRuns } = matchWeek({
    weekIndex,
    weekStart,
    planned: [],
    runs,
    overrides: {},
    today,
  })
  return render(
    <StorageProvider storage={emptyStorage()}>
      <WeekPager
        view={view}
        runs={runs}
        today={today}
        weekIndex={weekIndex}
        weekStart={weekStart}
        rows={rows}
        extraRuns={extraRuns}
        onOpenRun={onOpenRun}
      />
    </StorageProvider>,
  )
}

describe('WeekPager', () => {
  it('has last week, this week and next week in order', async () => {
    show('2026-11-17', '2026-11-16', 2)
    expect(
      await screen.findByRole('group', { name: 'Last week' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'This week' })).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Next week, projected' }),
    ).toBeInTheDocument()
    const region = screen.getByRole('region', { name: /swipe/ })
    const labels = Array.from(region.querySelectorAll('.week-panel-label')).map(
      (el) => el.textContent,
    )
    expect(labels).toEqual([
      'Last week · Nov 9–15',
      'This week · Nov 16–22',
      'Next week · projected · Nov 23–29',
    ])
  })

  it('has no last week in week 1', () => {
    show('2026-11-10', '2026-11-09', 1, [])
    expect(
      screen.queryByRole('group', { name: 'Last week' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'This week' })).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Next week, projected' }),
    ).toBeInTheDocument()
  })

  it('has no next week in race week', async () => {
    show('2027-03-21', '2027-03-15', 19, [])
    expect(screen.getByRole('group', { name: 'This week' })).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Next week, projected' }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('group', { name: 'Last week' }),
    ).toBeInTheDocument()
  })

  it('opens a run from a day in last week', async () => {
    const opened: Run[] = []
    show('2026-11-17', '2026-11-16', 2, weekOneRuns, (run) => opened.push(run))
    const last = await screen.findByRole('group', { name: 'Last week' })
    const days = within(last).getAllByRole('button', {
      name: /Run details for/,
    })
    await userEvent.click(days[0])
    expect(weekOneRuns.map((run) => run.id)).toContain(opened[0].id)
  })

  it('does not make projected days tappable', () => {
    show('2026-11-17', '2026-11-16', 2)
    const next = screen.getByRole('group', { name: 'Next week, projected' })
    expect(next.querySelector('button')).toBeNull()
  })
})
