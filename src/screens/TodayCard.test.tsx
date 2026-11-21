import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PlannedRun, Run } from '../engine/types'
import { matchWeek } from '../plan/weekMatch'
import { TodayCard } from './TodayCard'

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

const show = (today: string, runs: Run[] = [], plan = planned) => {
  const { rows, extraRuns } = matchWeek({
    weekIndex: 2,
    weekStart: '2026-11-16',
    planned: plan,
    runs,
    overrides: {},
    today,
  })
  return render(
    <TodayCard
      weekStart="2026-11-16"
      rows={rows}
      extraRuns={extraRuns}
      today={today}
    />,
  )
}

describe('TodayCard: a planned run', () => {
  it('shows an easy run with its date and miles', () => {
    show('2026-11-18')
    expect(
      screen.getByRole('heading', { name: "Today's workout" }),
    ).toBeInTheDocument()
    expect(screen.getByText('Easy run')).toBeInTheDocument()
    expect(screen.getByText('Wed, Nov 18')).toBeInTheDocument()
    expect(screen.getByText('2.3 miles')).toBeInTheDocument()
    expect(screen.getByText('To do')).toBeInTheDocument()
  })

  it('shows a long run', () => {
    show('2026-11-20')
    expect(screen.getByText('Long run')).toBeInTheDocument()
    expect(screen.getByText('4.7 miles')).toBeInTheDocument()
  })

  it('colours the edge by run type', () => {
    const { container, unmount } = show('2026-11-18')
    expect(container.querySelector('.kind-easy')).not.toBeNull()
    expect(container.querySelector('.kind-long')).toBeNull()
    unmount()
    const long = show('2026-11-20')
    expect(long.container.querySelector('.kind-long')).not.toBeNull()
  })

  it('shows done, with the miles actually run', () => {
    show('2026-11-18', [run('a', '2026-11-18', 2.5)])
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Ran 2.5 miles')).toBeInTheDocument()
    expect(screen.queryByText('To do')).not.toBeInTheDocument()
  })
})

describe('TodayCard: no planned run', () => {
  it('says rest day, and what is next', () => {
    show('2026-11-17')
    expect(screen.getByText('Rest day')).toBeInTheDocument()
    expect(screen.getByText('Tue, Nov 17')).toBeInTheDocument()
    expect(
      screen.getByText('Next: Wed, Nov 18, easy run, 2.3 miles'),
    ).toBeInTheDocument()
  })

  it('skips runs already done when naming the next one', () => {
    show('2026-11-17', [run('a', '2026-11-18', 2.3)])
    expect(
      screen.getByText('Next: Fri, Nov 20, long run, 4.7 miles'),
    ).toBeInTheDocument()
  })

  it('says nothing is next after the last planned run', () => {
    show('2026-11-21')
    expect(screen.getByText('Rest day')).toBeInTheDocument()
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  it('says rest day when nothing is planned at all', () => {
    show('2026-11-17', [], [])
    expect(screen.getByText('Rest day')).toBeInTheDocument()
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  it('shows an extra run logged on a rest day', () => {
    show('2026-11-21', [run('x', '2026-11-21', 3.25)])
    expect(screen.queryByText('Rest day')).not.toBeInTheDocument()
    expect(screen.getByText('Extra run')).toBeInTheDocument()
    expect(screen.getByText('3.25 miles')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})

describe('TodayCard: only today counts', () => {
  it('ignores an extra run from another day', () => {
    show('2026-11-17', [run('x', '2026-11-21', 3.25)])
    expect(screen.getByText('Rest day')).toBeInTheDocument()
    expect(screen.queryByText('Extra run')).not.toBeInTheDocument()
  })

  it('does not say what is next when today has a planned run', () => {
    show('2026-11-18')
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  it('does not say what is next after an extra run today', () => {
    show('2026-11-17', [run('x', '2026-11-17', 3)])
    expect(screen.getByText('Extra run')).toBeInTheDocument()
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })
})

describe('TodayCard: outside the week', () => {
  it('shows nothing when today is not in this week', () => {
    const { container } = show('2026-11-30')
    expect(container.firstChild).toBeNull()
  })
})

describe('TodayCard: details', () => {
  const toggle = () => screen.getByRole('button', { name: /details/i })

  it('starts collapsed, with a Show details button', () => {
    show('2026-11-18')
    expect(toggle()).toHaveTextContent('Show details')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/conversational/)).not.toBeInTheDocument()
  })

  it('opens to the easy-run advice, and closes again', async () => {
    const user = userEvent.setup()
    show('2026-11-18')
    await user.click(toggle())
    expect(toggle()).toHaveTextContent('Hide details')
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/A relaxed run/)).toBeInTheDocument()
    expect(screen.getByText(/conversational/)).toBeInTheDocument()
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument()
    await user.click(toggle())
    expect(screen.queryByText(/conversational/)).not.toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens to the long-run advice on a long run day', async () => {
    const user = userEvent.setup()
    show('2026-11-20')
    await user.click(toggle())
    expect(screen.getByText(/longest run of your week/)).toBeInTheDocument()
    expect(screen.getByText(/Bring water/)).toBeInTheDocument()
    expect(screen.queryByText(/conversational/)).not.toBeInTheDocument()
  })

  it('shows rest-day advice on a rest day', async () => {
    const user = userEvent.setup()
    show('2026-11-17')
    await user.click(toggle())
    expect(screen.getByText(/No run planned today/)).toBeInTheDocument()
  })

  it('shows extra-run advice after an unplanned run', async () => {
    const user = userEvent.setup()
    show('2026-11-17', [run('x', '2026-11-17', 3)])
    await user.click(toggle())
    expect(screen.getByText(/without a run planned/)).toBeInTheDocument()
  })

  it('still opens once the run is done', async () => {
    const user = userEvent.setup()
    show('2026-11-18', [run('a', '2026-11-18', 2.4)])
    await user.click(toggle())
    expect(screen.getByText(/conversational/)).toBeInTheDocument()
  })

  it('links the button to the panel it opens', async () => {
    const user = userEvent.setup()
    show('2026-11-18')
    await user.click(toggle())
    const id = toggle().getAttribute('aria-controls')
    expect(id).toBeTruthy()
    expect(document.getElementById(id as string)).toHaveTextContent(
      /A relaxed run/,
    )
  })
})
