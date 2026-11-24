import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Run } from '../engine/types'
import { computePlan } from '../plan/progress'
import { StorageProvider } from '../storage/StorageProvider'
import { emptyStorage, laterPlan } from '../test/fixtures'
import { PlanSettingsProvider } from '../plan/PlanSettingsProvider'
import { weekOneRuns } from '../test/fixtures'
import { CalendarCard } from './CalendarCard'

const TODAY = '2026-11-17'
const view = computePlan({
  runs: weekOneRuns,
  checkIns: [],
  savedResults: [],
  today: TODAY,
})

const show = (
  current = undefined as Parameters<typeof CalendarCard>[0]['current'],
  onOpenRun?: (run: Run) => void,
) =>
  render(
    <StorageProvider storage={emptyStorage()}>
      <CalendarCard
        view={view}
        runs={weekOneRuns}
        today={TODAY}
        current={current}
        onOpenRun={onOpenRun}
      />
    </StorageProvider>,
  )

describe('CalendarCard', () => {
  it('lists a finished week with its dates, miles and what the gate did', () => {
    show()
    const row = screen.getByRole('button', { name: /Week 1/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).toHaveTextContent('Nov 9–15')
    expect(row).toHaveTextContent('of 8.5 mi')
    expect(row).toHaveTextContent(/Then /)
  })

  it('keeps a finished week closed until you tap it, then shows its strip', async () => {
    show()
    expect(
      screen.queryByRole('group', { name: 'Week 1' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Week 1/ }))
    expect(
      await screen.findByRole('group', { name: 'Week 1' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Week 1/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('shows this week open when it is loaded', () => {
    show({ weekIndex: 2, weekStart: '2026-11-16', rows: [], extraRuns: [] })
    expect(
      screen.getByRole('group', { name: 'Week 2, this week' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Nov 16–22 · This week/)).toBeInTheDocument()
  })

  it('shows nothing before the plan starts', () => {
    const early = computePlan({
      runs: [],
      checkIns: [],
      savedResults: [],
      today: '2026-11-08',
    })
    const { container } = render(
      <StorageProvider storage={emptyStorage()}>
        <CalendarCard view={early} runs={[]} today="2026-11-08" />
      </StorageProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CalendarCard: opening a run', () => {
  it('opens a run from a day in an opened past week', async () => {
    const opened: Run[] = []
    show(undefined, (run) => opened.push(run))
    await userEvent.click(screen.getByRole('button', { name: /Week 1/ }))
    const days = await screen.findAllByRole('button', {
      name: /Run details for/,
    })
    expect(days.length).toBeGreaterThan(0)
    await userEvent.click(days[0])
    expect(weekOneRuns.map((run) => run.id)).toContain(opened[0].id)
  })
})

describe('CalendarCard: the projected week', () => {
  const open = (week: number) =>
    userEvent.click(
      screen.getByRole('button', { name: new RegExp(`Week ${week}(?!\\d)`) }),
    )

  it('is a closed row above this week, marked projected', () => {
    show({ weekIndex: 2, weekStart: '2026-11-16', rows: [], extraRuns: [] })
    const row = screen.getByRole('button', { name: /Week 3(?!\d)/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).toHaveTextContent('Nov 23–29')
    expect(row).toHaveTextContent('Projected')
    expect(row).toHaveTextContent('Subject to change')
    expect(
      screen.queryByRole('group', { name: 'Week 3, projected' }),
    ).not.toBeInTheDocument()
    const thisWeek = screen.getByRole('group', { name: 'Week 2, this week' })
    expect(
      row.compareDocumentPosition(thisWeek) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('opens to show the planned runs and why', async () => {
    show()
    await open(3)
    expect(
      screen.getByRole('group', { name: 'Week 3, projected' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        `If you hit this week's target of ${view.target?.targetMiles} miles.`,
      ),
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('group')
        .some((g) =>
          /planned, coming up/.test(g.getAttribute('aria-label') ?? ''),
        ),
    ).toBe(true)
  })

  it('closes again when tapped twice', async () => {
    show()
    await open(3)
    await open(3)
    expect(
      screen.queryByRole('group', { name: 'Week 3, projected' }),
    ).not.toBeInTheDocument()
  })

  it('shows the row even before this week has loaded', () => {
    show(undefined)
    expect(
      screen.getByRole('button', { name: /Week 3(?!\d)/ }),
    ).toBeInTheDocument()
  })

  it('has nothing to open on a projected day', async () => {
    show(undefined, () => {})
    await open(3)
    const strip = screen.getByRole('group', { name: 'Week 3, projected' })
    expect(strip.querySelector('button')).toBeNull()
  })

  it('shows only the projection row in week 1', () => {
    const week1 = computePlan({
      runs: [],
      checkIns: [],
      savedResults: [],
      today: '2026-11-10',
    })
    render(
      <StorageProvider storage={emptyStorage()}>
        <CalendarCard view={week1} runs={[]} today="2026-11-10" />
      </StorageProvider>,
    )
    expect(
      screen.getByRole('button', { name: /Week 2(?!\d)/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Week 1(?!\d)/ }),
    ).not.toBeInTheDocument()
  })

  it('has no projection in race week', () => {
    const race = computePlan({
      runs: [],
      checkIns: [],
      savedResults: [],
      today: '2027-03-21',
    })
    render(
      <StorageProvider storage={emptyStorage()}>
        <CalendarCard view={race} runs={[]} today="2027-03-21" />
      </StorageProvider>,
    )
    expect(screen.queryByText(/Projected/)).not.toBeInTheDocument()
  })
})

describe('CalendarCard: with a different plan', () => {
  it('dates the projected week from the start date in the settings', () => {
    const laterView = computePlan({
      runs: [],
      checkIns: [],
      savedResults: [],
      today: TODAY,
      settings: laterPlan,
    })
    render(
      <PlanSettingsProvider plan={laterPlan}>
        <StorageProvider storage={emptyStorage()}>
          <CalendarCard view={laterView} runs={[]} today={TODAY} />
        </StorageProvider>
      </PlanSettingsProvider>,
    )
    // Week 1 is Nov 16-22 in this plan, so the projected week 2 is Nov 23-29.
    expect(screen.getByRole('button', { name: /Week 2/ })).toHaveTextContent(
      'Nov 23–29',
    )
  })
})
