import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { goalCheck } from './goalCheck'
import { buildTargetCurve } from './targetCurve'

describe('goalCheck', () => {
  it('is on track for a 22-mile peak from an 8-mile start', () => {
    const curve = buildTargetCurve(8, 22, 19)
    expect(goalCheck(22, curve, [])).toEqual({
      onTrack: true,
      gapMiles: 0,
      reachablePeakMiles: 22.8,
    })
  })

  it('is off track, with a gap near 7.7 miles, for a 22-mile peak from 5 miles', () => {
    const curve = buildTargetCurve(5, 22, 19)
    expect(goalCheck(22, curve, [])).toEqual({
      onTrack: false,
      gapMiles: 7.7,
      reachablePeakMiles: 14.3,
    })
  })

  it('is on track for a 13-mile peak from 7 miles', () => {
    const curve = buildTargetCurve(7, 13, 19)
    expect(goalCheck(13, curve, [])).toEqual({
      onTrack: true,
      gapMiles: 0,
      reachablePeakMiles: 20,
    })
  })

  it('is off track from my real start of 4 miles, even though the curve looks fine', () => {
    // the curve's peak is already lowered, so only the goal shows the gap
    const curve = buildTargetCurve(4, 22, 19)
    expect(Math.max(...curve)).toBe(11.8)
    expect(goalCheck(22, curve, [])).toEqual({
      onTrack: false,
      gapMiles: 10.2,
      reachablePeakMiles: 11.8,
    })
  })

  it('never returns a negative gap', () => {
    const curve = buildTargetCurve(8, 22, 19)
    const result = goalCheck(5, curve, [])
    expect(result.gapMiles).toBe(0)
    expect(result.onTrack).toBe(true)
  })

  it('starts from week 1 at the first target when no weeks are finished', () => {
    const curve = buildTargetCurve(4, 22, 19)
    expect(goalCheck(22, curve, [])).toEqual(goalCheck(22, curve, [4]))
  })

  it('uses the latest finished week as the starting point', () => {
    const curve = buildTargetCurve(4, 22, 19)
    expect(goalCheck(22, curve, [4, 4, 4])).toEqual({
      onTrack: false,
      gapMiles: 12.3,
      reachablePeakMiles: 9.7,
    })
    expect(goalCheck(22, curve, [4, 4.5, 5]).reachablePeakMiles).toBe(11.8)
  })

  it('skips a recovery week when picking the starting point', () => {
    const curve = buildTargetCurve(4, 22, 19)
    expect(goalCheck(22, curve, [4, 4.5, 5, 3.8])).toEqual(
      goalCheck(22, curve, [4, 4.5, 5]),
    )
  })

  it('ignores weeks after the peak week, so the taper cannot look like falling behind', () => {
    const curve = buildTargetCurve(4, 22, 19)
    const actuals = Array.from({ length: 18 }, (_, i) => curve[i])
    actuals[14] = 12.3
    expect(goalCheck(22, curve, actuals)).toEqual({
      onTrack: false,
      gapMiles: 9.7,
      reachablePeakMiles: 12.3,
    })
  })

  it('uses goalOnTrackShare from a custom config', () => {
    const curve = buildTargetCurve(8, 22, 19)
    const exact = { ...DEFAULT_CONFIG, goalOnTrackShare: 1 }
    expect(goalCheck(22.8, curve, [], exact).onTrack).toBe(true)
    expect(goalCheck(22.9, curve, [], exact).onTrack).toBe(false)

    const lenient = { ...DEFAULT_CONFIG, goalOnTrackShare: 0.5 }
    const low = buildTargetCurve(5, 22, 19)
    expect(goalCheck(22, low, [], lenient).onTrack).toBe(true)
  })

  it('throws a RangeError for bad miles or an empty curve', () => {
    const curve = buildTargetCurve(8, 22, 19)
    expect(() => goalCheck(-1, curve, [])).toThrow(RangeError)
    expect(() => goalCheck(NaN, curve, [])).toThrow(RangeError)
    expect(() => goalCheck(22, [], [])).toThrow(RangeError)
    expect(() => goalCheck(22, curve, [-1])).toThrow(RangeError)
    expect(() => goalCheck(22, curve, [NaN])).toThrow(RangeError)
    expect(() => goalCheck(22, [8, NaN], [])).toThrow(RangeError)
  })
})
