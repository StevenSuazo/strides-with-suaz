import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Decision, WeekResult } from '../engine/types'
import { computePlan, type PlanView } from '../plan/progress'
import { laterPlan, weekOne, weekOneRuns } from '../test/fixtures'
import { PlanSettingsProvider } from '../plan/PlanSettingsProvider'
import { ProgressChart } from './ProgressChart'

const realView = (today: string, withRuns = true): PlanView =>
  computePlan({
    runs: withRuns ? weekOneRuns : [],
    checkIns: [],
    savedResults: withRuns ? [weekOne] : [],
    today,
  })

const fake = (
  weeks: { result: WeekResult; decision?: Decision }[],
): PlanView => ({
  ...realView('2026-11-17'),
  weeks: weeks.map(({ result, decision }) => ({
    result,
    ...(decision ? { gate: { decision } as never } : {}),
  })),
})
const result = (
  weekIndex: number,
  targetMiles: number,
  actualMiles: number,
): WeekResult => ({
  weekIndex,
  targetMiles,
  actualMiles,
  longRunMiles: 0,
  highestPain: 0,
})

const chart = () =>
  screen.getByRole('img', { name: 'Weekly miles: target and actual' })

describe('ProgressChart', () => {
  it('has a heading and an accessible chart', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(
      screen.getByRole('heading', { name: 'Your plan' }),
    ).toBeInTheDocument()
    expect(chart()).toBeInTheDocument()
  })

  it('draws a bar for each finished week and the current week only', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(chart().querySelectorAll('.bar')).toHaveLength(2)
    expect(chart().querySelectorAll('.bar-hit')).toHaveLength(1)
    expect(chart().querySelectorAll('.bar-current')).toHaveLength(1)
  })

  it('draws no bars before the plan starts', () => {
    render(<ProgressChart view={realView('2026-11-01', false)} />)
    expect(chart().querySelectorAll('.bar')).toHaveLength(0)
    expect(chart().querySelector('.target-line')).not.toBeNull()
  })

  it('draws a bar for every week once the plan is over', () => {
    render(<ProgressChart view={realView('2027-06-01')} />)
    expect(chart().querySelectorAll('.bar')).toHaveLength(19)
  })

  it('draws the target line across all 19 weeks', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    const points =
      chart().querySelector('.target-line')?.getAttribute('points') ?? ''
    expect(points.trim().split(' ')).toHaveLength(19)
  })

  it('scales bar heights to the miles run', () => {
    render(
      <ProgressChart
        view={fake([
          { result: result(1, 10, 4) },
          { result: result(2, 10, 8) },
        ])}
      />,
    )
    const [a, b] = Array.from(chart().querySelectorAll('.bar')).map((bar) =>
      Number(bar.getAttribute('height')),
    )
    expect(a).toBeGreaterThan(0)
    expect(b / a).toBeCloseTo(2, 5)
  })

  it('colours bars by how close the week came to its target', () => {
    render(
      <ProgressChart
        view={fake([
          { result: result(1, 10, 10) },
          { result: result(2, 10, 8) },
          { result: result(3, 10, 5) },
        ])}
      />,
    )
    expect(chart().querySelectorAll('.bar-hit')).toHaveLength(1)
    expect(chart().querySelectorAll('.bar-close')).toHaveLength(1)
    expect(chart().querySelectorAll('.bar-short')).toHaveLength(1)
  })

  it('marks each finished week with a symbol as well as a colour', () => {
    render(
      <ProgressChart
        view={fake([
          { result: result(1, 10, 10) },
          { result: result(2, 10, 8) },
          { result: result(3, 10, 5) },
        ])}
      />,
    )
    const marks = Array.from(chart().querySelectorAll('.mark')).map(
      (m) => m.textContent,
    )
    expect(marks).toEqual(['✓', '!', '✕'])
  })

  it('shows when the gate stepped back or repeated a week', () => {
    render(
      <ProgressChart
        view={fake([
          { result: result(1, 10, 5), decision: 'stepBack' },
          { result: result(2, 10, 8), decision: 'repeat' },
          { result: result(3, 10, 10), decision: 'advance' },
        ])}
      />,
    )
    const marks = Array.from(chart().querySelectorAll('.mark')).map(
      (m) => m.textContent,
    )
    expect(marks).toEqual(['✕↓', '!↻', '✓'])
  })

  it('labels the peak with its miles', () => {
    const view = realView('2026-11-17')
    render(<ProgressChart view={view} />)
    expect(chart().querySelector('.peak-label')?.textContent).toBe(
      String(Math.max(...view.curve)),
    )
  })

  it('labels race day', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(screen.getByText('Race Sun, Mar 21')).toBeInTheDocument()
  })

  it('numbers the weeks and rings the current one', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(chart().querySelectorAll('.week-label')).toHaveLength(19)
    const current = chart().querySelectorAll('.week-label.current')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toBe('2')
    expect(chart().querySelectorAll('.week-ring')).toHaveLength(1)
  })

  it('explains the symbols', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(
      screen.getByText(
        '✓ hit target · ! close · ✕ short · ↓ stepped back · ↻ repeated',
      ),
    ).toBeInTheDocument()
  })
})

describe('ProgressChart: table for screen readers', () => {
  const rows = () => screen.getAllByRole('row').slice(1)

  it('has a row for every week', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    expect(rows()).toHaveLength(19)
  })

  it('describes a finished week in words', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    const cells = Array.from(rows()[0].querySelectorAll('td, th')).map(
      (c) => c.textContent,
    )
    expect(cells).toEqual([
      'Week 1',
      '8.5',
      '8.56',
      'Hit target, then moved up',
    ])
  })

  it('describes the current and future weeks', () => {
    render(<ProgressChart view={realView('2026-11-17')} />)
    const current = Array.from(rows()[1].querySelectorAll('td, th')).map(
      (c) => c.textContent,
    )
    expect(current).toEqual(['Week 2', '9.3', '0', 'In progress'])
    const future = Array.from(rows()[2].querySelectorAll('td, th')).map(
      (c) => c.textContent,
    )
    expect(future[0]).toBe('Week 3')
    expect(future[2]).toBe('—')
    expect(future[3]).toBe('Coming up')
  })

  it('words close and short weeks', () => {
    render(
      <ProgressChart
        view={fake([
          { result: result(1, 10, 8), decision: 'repeat' },
          { result: result(2, 10, 5), decision: 'stepBack' },
        ])}
      />,
    )
    expect(rows()[0].textContent).toContain('Close, then repeated the target')
    expect(rows()[1].textContent).toContain('Short, then stepped back')
  })
})

describe('ProgressChart: with a different plan', () => {
  it('labels the race date from the settings', () => {
    render(
      <PlanSettingsProvider plan={laterPlan}>
        <ProgressChart view={realView('2026-11-17')} />
      </PlanSettingsProvider>,
    )
    expect(screen.getByText('Race Sun, Mar 28')).toBeInTheDocument()
  })
})
