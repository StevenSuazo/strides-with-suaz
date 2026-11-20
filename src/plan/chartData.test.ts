import { describe, expect, it } from 'vitest'
import type { Decision, WeekResult } from '../engine/types'
import { weekOne, weekOneRuns } from '../test/fixtures'
import { buildChart } from './chartData'
import { computePlan, type PlanView } from './progress'

const view = (today: string, withRuns = true): PlanView =>
  computePlan({
    runs: withRuns ? weekOneRuns : [],
    checkIns: [],
    savedResults: withRuns ? [weekOne] : [],
    today,
  })

// A hand-made plan view, for exact control over the numbers.
const fake = (
  weeks: { result: WeekResult; decision?: Decision }[],
  extra: Partial<PlanView> = {},
): PlanView => {
  const base = view('2026-11-17')
  return {
    ...base,
    weeks: weeks.map(({ result, decision }) => ({
      result,
      ...(decision ? { gate: { decision } as never } : {}),
    })),
    ...extra,
  }
}
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

describe('buildChart: shape', () => {
  it('has one entry per plan week with the curve miles', () => {
    const chart = buildChart(view('2026-11-01', false))
    expect(chart.weeks).toHaveLength(19)
    expect(chart.weeks.map((w) => w.weekIndex)).toEqual(
      Array.from({ length: 19 }, (_, i) => i + 1),
    )
    expect(chart.weeks.map((w) => w.curveMiles)).toEqual(
      view('2026-11-01', false).curve,
    )
  })

  it('shows every week as future before the plan starts', () => {
    const chart = buildChart(view('2026-11-01', false))
    expect(chart.weeks.every((w) => w.kind === 'future')).toBe(true)
  })

  it('marks finished, current and future weeks', () => {
    const chart = buildChart(view('2026-11-17'))
    expect(chart.weeks.slice(0, 3).map((w) => w.kind)).toEqual([
      'done',
      'current',
      'future',
    ])
    expect(chart.weeks.slice(2).every((w) => w.kind === 'future')).toBe(true)
  })

  it('shows every week as done once the plan is over', () => {
    const chart = buildChart(view('2027-06-01'))
    expect(chart.weeks.every((w) => w.kind === 'done')).toBe(true)
  })

  it('has no actual miles for future weeks', () => {
    const [, , third] = buildChart(view('2026-11-17')).weeks
    expect(third.actualMiles).toBeUndefined()
    expect(third.targetMiles).toBeUndefined()
  })
})

describe('buildChart: finished and current weeks', () => {
  it('uses the real target and the miles run for a finished week', () => {
    const [first] = buildChart(view('2026-11-17')).weeks
    expect(first.targetMiles).toBe(8.5)
    expect(first.actualMiles).toBe(8.56)
    expect(first.level).toBe('hit')
    expect(first.decision).toBe('advance')
  })

  it("uses this week's target and miles so far for the current week", () => {
    const [, second] = buildChart(view('2026-11-17')).weeks
    expect(second.targetMiles).toBe(9.3)
    expect(second.actualMiles).toBe(0)
    expect(second.level).toBeUndefined()
  })

  it("rates a week by the gate's own thresholds", () => {
    const chart = buildChart(
      fake([
        { result: result(1, 10, 10) },
        { result: result(2, 10, 9) },
        { result: result(3, 10, 8) },
        { result: result(4, 10, 5) },
      ]),
    )
    expect(chart.weeks.slice(0, 4).map((w) => w.level)).toEqual([
      'hit',
      'hit',
      'close',
      'short',
    ])
  })

  it('counts a week with no target as hit', () => {
    const chart = buildChart(fake([{ result: result(1, 0, 0) }]))
    expect(chart.weeks[0].level).toBe('hit')
  })

  it('keeps what the gate decided after the week', () => {
    const chart = buildChart(
      fake([
        { result: result(1, 10, 3), decision: 'stepBack' },
        { result: result(2, 10, 8), decision: 'repeat' },
      ]),
    )
    expect(chart.weeks[0].decision).toBe('stepBack')
    expect(chart.weeks[1].decision).toBe('repeat')
  })
})

describe('buildChart: scale and peak', () => {
  it('finds the peak week', () => {
    const v = view('2026-11-01', false)
    const chart = buildChart(v)
    expect(v.curve[chart.peakIndex]).toBe(Math.max(...v.curve))
  })

  it('rounds the top of the scale up to a multiple of 5', () => {
    const v = view('2026-11-01', false)
    const chart = buildChart(v)
    expect(chart.maxMiles % 5).toBe(0)
    expect(chart.maxMiles).toBeGreaterThanOrEqual(Math.max(...v.curve))
    expect(chart.maxMiles).toBeLessThan(Math.max(...v.curve) + 5)
  })

  it('grows the scale when you run more than the plan', () => {
    const chart = buildChart(fake([{ result: result(1, 10, 40) }]))
    expect(chart.maxMiles).toBe(40)
  })
})
