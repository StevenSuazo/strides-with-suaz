import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { emptyStorage, seededStorage } from '../test/fixtures'
import { Dashboard } from './Dashboard'

// The Planned runs card only, since the today card can repeat a run's words.
const plannedRuns = () =>
  within(
    screen
      .getByRole('heading', { name: 'Planned runs' })
      .closest('section') as HTMLElement,
  )

const show = (storage: AppStorage) => {
  let count = 0
  render(
    <StorageProvider storage={storage}>
      <Dashboard today="2026-11-17" newId={() => `test-${++count}`} />
    </StorageProvider>,
  )
  return userEvent.setup()
}

describe('Dashboard: loading', () => {
  it('shows a loading message, then the week', async () => {
    show(await seededStorage())
    expect(screen.getByText('Loading your plan…')).toBeInTheDocument()
    expect(await screen.findByText('Week 2 of 19')).toBeInTheDocument()
    expect(screen.queryByText('Loading your plan…')).not.toBeInTheDocument()
  })

  it('shows why when the plan cannot be loaded', async () => {
    const storage = await seededStorage()
    storage.getRuns = async () => {
      throw new Error('offline')
    }
    show(storage)
    expect(
      await screen.findByText("Couldn't load your plan: offline"),
    ).toBeInTheDocument()
  })
})

describe('Dashboard: runs', () => {
  it('lists the saved runs under the week', async () => {
    show(await seededStorage())
    expect(
      await screen.findByText(/Sun, Nov 15: 4.01 miles/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Mon, Nov 9: 2.05 miles/)).toBeInTheDocument()
  })

  it('logs a run and updates the week', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('0 of 9.3 miles so far')
    await user.type(screen.getByLabelText('Miles'), '3.1')
    await user.click(screen.getByRole('button', { name: 'Log run' }))
    expect(
      await screen.findByText('3.1 of 9.3 miles so far'),
    ).toBeInTheDocument()
    const saved = await storage.getRuns()
    expect(saved).toHaveLength(4)
    expect(saved.at(-1)).toEqual({
      id: 'test-1',
      date: '2026-11-17',
      miles: 3.1,
      source: 'in_app',
    })
  })

  it('does not save a bad run', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Week 2 of 19')
    await user.click(screen.getByRole('button', { name: 'Log run' }))
    expect(
      await screen.findByText('Enter the miles you ran (more than 0).'),
    ).toBeInTheDocument()
    expect(await storage.getRuns()).toHaveLength(3)
  })

  it('edits a run in place, without adding a duplicate', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Week 2 of 19')
    await user.click(
      screen.getByRole('button', { name: 'Actions for Sun, Nov 15 run' }),
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Edit Sun, Nov 15 run' }),
    )
    const miles = screen.getByLabelText('Miles') as HTMLInputElement
    expect(miles.value).toBe('4.01')
    await user.clear(miles)
    await user.type(miles, '5')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/Sun, Nov 15: 5 miles/)).toBeInTheDocument()
    const saved = await storage.getRuns()
    expect(saved).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Log run' })).toBeInTheDocument()
  })

  it('goes back to logging a new run when you cancel an edit', async () => {
    const user = show(await seededStorage())
    await screen.findByText('Week 2 of 19')
    await user.click(
      screen.getByRole('button', { name: 'Actions for Sun, Nov 15 run' }),
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Edit Sun, Nov 15 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Log run' })).toBeInTheDocument()
    expect((screen.getByLabelText('Miles') as HTMLInputElement).value).toBe('')
  })

  it('deletes a run after confirming and updates the week', async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'w2',
      date: '2026-11-17',
      miles: 3,
      source: 'in_app',
    })
    const user = show(storage)
    await screen.findByText('3 of 9.3 miles so far')
    await user.click(
      screen.getByRole('button', { name: 'Actions for Tue, Nov 17 run' }),
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Delete Tue, Nov 17 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('0 of 9.3 miles so far')).toBeInTheDocument()
    expect(await storage.getRuns()).toHaveLength(3)
    expect(screen.queryByText(/Tue, Nov 17: 3 miles/)).not.toBeInTheDocument()
  })

  it('changes this week’s target when an old run is fixed', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Target: 9.3 miles')
    await user.click(
      screen.getByRole('button', { name: 'Actions for Sun, Nov 15 run' }),
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Edit Sun, Nov 15 run' }),
    )
    const miles = screen.getByLabelText('Miles') as HTMLInputElement
    await user.clear(miles)
    await user.type(miles, '1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(screen.queryByText('Target: 9.3 miles')).not.toBeInTheDocument(),
    )
    const [week] = await storage.getWeekResults()
    expect(week.weekIndex).toBe(1)
    expect(week.actualMiles).toBe(5.55)
  })
})

describe('Dashboard: check-ins', () => {
  it('lists saved check-ins', async () => {
    const storage = await seededStorage()
    await storage.saveCheckIn({
      id: 'c1',
      date: '2026-11-15',
      feel: 'good',
      kind: 'afterRun',
      entries: [],
    })
    show(storage)
    expect(
      await screen.findByText('Sun, Nov 15: after a run, felt good, no pain.'),
    ).toBeInTheDocument()
  })

  it('saves a check-in, and high pain steps the plan back', async () => {
    const storage = await seededStorage()
    const user = show(storage)
    await screen.findByText('Target: 9.3 miles')
    fireEvent.change(screen.getByLabelText('Check-in date'), {
      target: { value: '2026-11-15' },
    })
    await user.click(screen.getByRole('button', { name: 'Add a sore spot' }))
    await user.selectOptions(screen.getByLabelText('Pain 1'), '8')
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))
    await waitFor(() =>
      expect(screen.queryByText('Target: 9.3 miles')).not.toBeInTheDocument(),
    )
    expect(await storage.getCheckIns()).toHaveLength(1)
    const [week] = await storage.getWeekResults()
    expect(week.highestPain).toBe(8)
  })

  it('deletes a check-in after confirming', async () => {
    const storage = await seededStorage()
    await storage.saveCheckIn({
      id: 'c1',
      date: '2026-11-15',
      feel: 'rough',
      kind: 'afterRun',
      entries: [{ area: 'knee', side: 'left', pain: 8 }],
    })
    const user = show(storage)
    await screen.findByText('Week 2 of 19')
    await user.click(
      screen.getByRole('button', { name: 'Delete Sun, Nov 15 check-in' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('No check-ins yet.')).toBeInTheDocument()
    expect(await storage.getCheckIns()).toEqual([])
    await waitFor(() =>
      expect(screen.getByText('Target: 9.3 miles')).toBeInTheDocument(),
    )
  })
})

describe('Dashboard: schedule', () => {
  const renderIt = async () =>
    render(
      <StorageProvider storage={await seededStorage()}>
        <Dashboard today="2026-11-17" newId={() => 'x'} />
      </StorageProvider>,
    )

  it('plans this week from the default all-open availability', async () => {
    await renderIt()
    expect(
      await screen.findByText('Fri, Nov 20: long run, 4.7 miles'),
    ).toBeInTheDocument()
  })

  it('saves availability and re-plans the week', async () => {
    await renderIt()
    await screen.findByText('Fri, Nov 20: long run, 4.7 miles')
    fireEvent.change(screen.getByLabelText('Friday'), {
      target: { value: 'off' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    expect(
      screen.queryByText('Fri, Nov 20: long run, 4.7 miles'),
    ).not.toBeInTheDocument()
    expect(plannedRuns().getByText(/long run, 4\.7 miles/)).toBeInTheDocument()
  })

  it('stores the availability for this week in storage', async () => {
    const storage = await seededStorage()
    render(
      <StorageProvider storage={storage}>
        <Dashboard today="2026-11-17" newId={() => 'x'} />
      </StorageProvider>,
    )
    await screen.findByRole('heading', { name: 'Planned runs' })
    fireEvent.change(screen.getByLabelText('Friday'), {
      target: { value: 'off' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    expect(await storage.getAvailability(2)).toEqual([
      'open',
      'open',
      'open',
      'open',
      'off',
      'open',
      'open',
    ])
  })

  it('remembers saved availability for this week', async () => {
    const storage = await seededStorage()
    await storage.saveAvailability(2, [
      'open',
      'open',
      'open',
      'open',
      'off',
      'open',
      'open',
    ])
    render(
      <StorageProvider storage={storage}>
        <Dashboard today="2026-11-17" newId={() => 'x'} />
      </StorageProvider>,
    )
    await screen.findByRole('heading', { name: 'Planned runs' })
    expect((screen.getByLabelText('Friday') as HTMLSelectElement).value).toBe(
      'off',
    )
    expect(screen.queryByText(/Fri, Nov 20/)).not.toBeInTheDocument()
  })

  it('is hidden before the plan starts', async () => {
    render(
      <StorageProvider storage={emptyStorage()}>
        <Dashboard today="2026-11-01" newId={() => 'x'} />
      </StorageProvider>,
    )
    await screen.findByText(/Plan starts in/)
    expect(
      screen.queryByRole('button', { name: 'Save availability' }),
    ).not.toBeInTheDocument()
  })
})

describe('Dashboard: planned vs done', () => {
  const withRun = async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'r1',
      date: '2026-11-16',
      miles: 2.5,
      source: 'in_app',
    })
    render(
      <StorageProvider storage={storage}>
        <Dashboard today="2026-11-17" newId={() => 'x'} />
      </StorageProvider>,
    )
    return storage
  }

  it('shows a logged run as done on its planned day', async () => {
    await withRun()
    expect(await screen.findByText('Done: ran 2.5 miles')).toBeInTheDocument()
  })

  it('moves a run to another planned day and saves the override', async () => {
    const storage = await withRun()
    await screen.findByText('Done: ran 2.5 miles')
    fireEvent.change(screen.getByLabelText('Run for Wed, Nov 18'), {
      target: { value: 'r1' },
    })
    await waitFor(async () =>
      expect(await storage.getOverrides()).toEqual({ r1: 'w2-2' }),
    )
    expect(
      (screen.getByLabelText('Run for Wed, Nov 18') as HTMLSelectElement).value,
    ).toBe('r1')
    expect(screen.getByText('Missed')).toBeInTheDocument()
  })

  it('remembers a saved override after a reload', async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'r1',
      date: '2026-11-16',
      miles: 2.5,
      source: 'in_app',
    })
    await storage.saveOverride('r1', 'w2-2')
    render(
      <StorageProvider storage={storage}>
        <Dashboard today="2026-11-17" newId={() => 'x'} />
      </StorageProvider>,
    )
    await screen.findByText('Done: ran 2.5 miles')
    expect(
      (screen.getByLabelText('Run for Wed, Nov 18') as HTMLSelectElement).value,
    ).toBe('r1')
  })
})

describe('Dashboard: collapsed forms', () => {
  const openStates = () =>
    Array.from(document.querySelectorAll('details')).map((d) => d.open)

  it('starts with every form collapsed', async () => {
    show(await seededStorage())
    await screen.findByText('Edit availability')
    expect(document.querySelectorAll('details').length).toBe(3)
    expect(openStates()).toEqual([false, false, false])
  })

  it('opens the run form when you start editing a run', async () => {
    show(await seededStorage())
    await screen.findByText('Edit availability')
    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Sun, Nov 15 run' }),
    )
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Edit Sun, Nov 15 run' }),
    )
    expect(screen.getByText('Edit run')).toBeInTheDocument()
    expect(openStates().filter(Boolean).length).toBe(1)
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
  })

  it('labels the sections you can open', async () => {
    show(await seededStorage())
    await screen.findByText('Edit availability')
    expect(screen.getByText('Log a run')).toBeInTheDocument()
    expect(screen.getByText('Add a check-in')).toBeInTheDocument()
    expect(screen.getByText('Edit availability')).toBeInTheDocument()
  })
})

describe('Dashboard: week strip', () => {
  it('shows this week as a strip above the week summary', async () => {
    show(await seededStorage())
    const strip = await screen.findByRole('group', { name: 'This week' })
    const summary = screen.getByText('Week 2 of 19')
    expect(
      strip.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.getByRole('group', { name: /Fri, Nov 20: long run/ }),
    ).toBeInTheDocument()
  })

  it('still shows the week summary before availability has loaded', async () => {
    show(await seededStorage())
    expect(await screen.findByText('Week 2 of 19')).toBeInTheDocument()
  })

  it('updates when you save availability', async () => {
    show(await seededStorage())
    await screen.findByRole('group', { name: /Fri, Nov 20: long run/ })
    fireEvent.change(screen.getByLabelText('Friday'), {
      target: { value: 'off' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await screen.findByText('Availability saved.')
    expect(
      screen.queryByRole('group', { name: /Fri, Nov 20: long run/ }),
    ).not.toBeInTheDocument()
  })
})

describe('Dashboard: week strip follows hand matches', () => {
  it('shows a moved run on the day it was matched to', async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'r1',
      date: '2026-11-16',
      miles: 2.5,
      source: 'in_app',
    })
    await storage.saveOverride('r1', 'w2-2')
    show(storage)
    expect(
      await screen.findByRole('group', {
        name: 'Wed, Nov 18: easy run, 2.3 miles planned, done: ran 2.5 miles',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', {
        name: 'Mon, Nov 16: easy run, 2.3 miles planned, missed',
      }),
    ).toBeInTheDocument()
  })
})

describe('Dashboard: run types', () => {
  it("marks last week's longest run as long", async () => {
    show(await seededStorage())
    await screen.findByText('Edit availability')
    const items = screen
      .getAllByRole('listitem')
      .filter((li) => li.querySelector('.run-menu'))
      .map((li) => li.textContent)
    const long = items.find((t) => t?.includes('Sun, Nov 15: 4.01 miles'))
    const easy = items.find((t) => t?.includes('Wed, Nov 11: 2.5 miles'))
    expect(long).toContain('Long')
    expect(easy).toContain('Easy')
  })

  it('uses the planned type for a run matched this week', async () => {
    const storage = await seededStorage()
    await storage.saveRun({
      id: 'r1',
      date: '2026-11-16',
      miles: 2.5,
      source: 'in_app',
    })
    show(storage)
    await screen.findByText('Done: ran 2.5 miles')
    const runItem = () =>
      screen
        .getAllByRole('listitem')
        .find(
          (li) =>
            li.querySelector('.run-menu') &&
            li.textContent?.includes('Mon, Nov 16: 2.5 miles'),
        )
    // Alone this week it is the longest run, but it was planned as an easy run.
    await waitFor(() => expect(runItem()?.textContent).toContain('Easy'))
    expect(runItem()?.querySelector('.dot-easy')).not.toBeNull()
    expect(runItem()?.querySelector('.dot-long')).toBeNull()
  })
})

describe('Dashboard: progress chart', () => {
  it('shows the plan chart between this week and the planned runs', async () => {
    show(await seededStorage())
    const chart = await screen.findByRole('heading', { name: 'Your plan' })
    const week = screen.getByText('Week 2 of 19')
    const planned = await screen.findByRole('heading', { name: 'Planned runs' })
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(week, chart)).toBe(true)
    expect(follows(chart, planned)).toBe(true)
  })

  it("shows this week's bar and last week's result", async () => {
    show(await seededStorage())
    await screen.findByRole('heading', { name: 'Your plan' })
    const svg = screen.getByRole('img', {
      name: 'Weekly miles: target and actual',
    })
    expect(svg.querySelectorAll('.bar-hit')).toHaveLength(1)
    expect(svg.querySelectorAll('.bar-current')).toHaveLength(1)
  })

  it('updates when you log a run', async () => {
    const user = show(await seededStorage())
    await screen.findByRole('heading', { name: 'Your plan' })
    const svg = () =>
      screen.getByRole('img', { name: 'Weekly miles: target and actual' })
    const height = () =>
      Number(svg().querySelector('.bar-current')?.getAttribute('height'))
    const before = height()
    await user.click(screen.getByText('Log a run'))
    await user.type(screen.getByLabelText('Miles'), '3')
    await user.click(screen.getByRole('button', { name: 'Log run' }))
    await waitFor(() => expect(height()).toBeGreaterThan(before))
  })
})

describe('Dashboard: today card', () => {
  const showOn = async (today: string, storage?: AppStorage) => {
    render(
      <StorageProvider storage={storage ?? (await seededStorage())}>
        <Dashboard today={today} newId={() => 'x'} />
      </StorageProvider>,
    )
  }
  const follows = (a: Node, b: Node) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it("shows today's workout between the strip and the week summary", async () => {
    await showOn('2026-11-18')
    const heading = await screen.findByRole('heading', {
      name: "Today's workout",
    })
    const strip = screen.getByRole('group', { name: 'This week' })
    expect(follows(strip, heading)).toBe(true)
    expect(follows(heading, screen.getByText('Week 2 of 19'))).toBe(true)
    expect(screen.getByText('Easy run')).toBeInTheDocument()
  })

  it('shows a rest day', async () => {
    await showOn('2026-11-17')
    expect(await screen.findByText('Rest day')).toBeInTheDocument()
  })

  it("turns to done when you log today's run", async () => {
    await showOn('2026-11-18')
    await screen.findByText('To do')
    fireEvent.click(screen.getByText('Log a run'))
    fireEvent.change(screen.getByLabelText('Miles'), {
      target: { value: '2.4' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Log run' }))
    expect(await screen.findByText('Ran 2.4 miles')).toBeInTheDocument()
  })

  it('is hidden before the plan starts', async () => {
    await showOn('2026-11-01', emptyStorage())
    await screen.findByText(/Plan starts in/)
    expect(
      screen.queryByRole('heading', { name: "Today's workout" }),
    ).not.toBeInTheDocument()
  })
})
