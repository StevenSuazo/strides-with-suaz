import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { computePlan, type PlanView } from '../plan/progress'
import { weekOne, weekOneRuns } from '../test/fixtures'
import { ThisWeek } from './ThisWeek'

const planFor = (today: string, withData = true): PlanView =>
  computePlan({
    runs: withData ? weekOneRuns : [],
    checkIns: [],
    savedResults: withData ? [weekOne] : [],
    today,
  })

const show = (today: string, view = planFor(today)) =>
  render(<ThisWeek view={view} today={today} />)

describe('ThisWeek: in progress', () => {
  it('shows the week number and days to the race', () => {
    show('2026-11-17')
    expect(screen.getByText('Week 2 of 19')).toBeInTheDocument()
    expect(screen.getByText('124 days to the race')).toBeInTheDocument()
  })

  it('shows the target and the long run', () => {
    show('2026-11-17')
    expect(screen.getByText('Target: 9.3 miles')).toBeInTheDocument()
    expect(screen.getByText('Long run: 4.7 miles')).toBeInTheDocument()
  })

  it('shows why the target is what it is', () => {
    const view = planFor('2026-11-17')
    show('2026-11-17', view)
    expect(screen.getByText(view.reason!)).toBeInTheDocument()
  })

  it('shows miles so far against the target, with a progress bar', () => {
    show('2026-11-17')
    expect(screen.getByText('0 of 9.3 miles so far')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', {
      name: 'Miles so far',
    }) as HTMLProgressElement
    expect(bar.value).toBe(0)
    expect(bar.max).toBe(9.3)
  })

  it('counts this week’s runs in the progress', () => {
    const view = computePlan({
      runs: weekOneRuns.slice(0, 2),
      checkIns: [],
      savedResults: [],
      today: '2026-11-11',
    })
    show('2026-11-11', view)
    expect(screen.getByText('4.55 of 8.5 miles so far')).toBeInTheDocument()
  })

  it('lists the past weeks and what followed each', () => {
    show('2026-11-17')
    expect(screen.getByText('Past weeks')).toBeInTheDocument()
    expect(
      screen.getByText('Week 1: ran 8.56 of 8.5 miles, then moved up.'),
    ).toBeInTheDocument()
  })

  it('says it is the starting week in week 1, with no past weeks', () => {
    show('2026-11-11')
    expect(screen.getByText('Week 1 of 19')).toBeInTheDocument()
    expect(
      screen.getByText('Week 1 is your starting week.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Past weeks')).not.toBeInTheDocument()
  })

  it('says you are on track for the peak', () => {
    show('2026-11-17')
    expect(
      screen.getByText('On track for your 22-mile peak.'),
    ).toBeInTheDocument()
  })

  it('says how far behind when the peak is out of reach', () => {
    const view = {
      ...planFor('2026-11-17'),
      goal: { onTrack: false, gapMiles: 2.4, reachablePeakMiles: 19.6 },
    }
    show('2026-11-17', view)
    expect(
      screen.getByText(
        'Behind pace for your 22-mile peak: about 2.4 miles short.',
      ),
    ).toBeInTheDocument()
  })

  it('counts down in the singular and on race day', () => {
    show('2027-03-20')
    expect(screen.getByText('1 day to the race')).toBeInTheDocument()
  })

  it('celebrates race day', () => {
    show('2027-03-21')
    expect(screen.getByText('Race day!')).toBeInTheDocument()
  })
})

describe('ThisWeek: before and after the plan', () => {
  it('counts down to the start and shows the first week', () => {
    show('2026-11-06', planFor('2026-11-06', false))
    expect(screen.getByText('Plan starts in 3 days')).toBeInTheDocument()
    expect(
      screen.getByText('First week: 8.5 miles, long run 4 miles.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Past weeks')).not.toBeInTheDocument()
  })

  it('says the plan is complete afterwards and still lists the weeks', () => {
    show('2027-03-22', planFor('2027-03-22', false))
    expect(screen.getByText('Plan complete')).toBeInTheDocument()
    expect(screen.getByText('Past weeks')).toBeInTheDocument()
    expect(screen.queryByText(/so far/)).not.toBeInTheDocument()
  })
})
