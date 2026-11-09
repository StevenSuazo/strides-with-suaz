# Spec: Weekly progression

Status: draft
Owner: me
Branch: feat/weekly-progression
Code lives in: `src/engine/` (pure TypeScript, no React, no network)
Replaces `pace-zones.md` as the v1 engine feature. Pace zones are deferred.

## 1. Goal

Decide each week's training volume. Build a target curve from race day backward, then use a weekly gate to advance, repeat, or step back based on what I actually ran. Also report whether the race goal is still realistic.

## 2. Non-goals

- No pace zones, VDOT, or pace-based workouts in v1. Workouts use effort labels (easy, comfortably hard).
- No UI, no Strava import (actual miles are entered by hand until Strava lands), no calendar integration.
- No heart-rate data.
- No automatic changes to the goal time. The engine reports, I decide.

## 3. Inputs

Unit decision: weekly volume is stored in **miles**. It matches Strava's distance data and the way I think about the plan. Early prep guidance in minutes is advice only, not engine input.

| Input | Type | Unit | Valid range |
| --- | --- | --- | --- |
| Race date | `Date` | n/a | in the future |
| Plan start date | `Date` (a Monday) | n/a | before race date |
| Total weeks | `number` | weeks | 1 or more (19 for this plan) |
| Starting weekly miles (week 1 target) | `number` | miles | 0 or more |
| Peak weekly miles | `number` | miles | at least starting miles |
| Last week: target miles | `number` | miles | greater than 0 |
| Last week: actual miles | `number` | miles | 0 or more |
| Last week: max pain score | `number` | 0 to 10 | integer |

Config, with defaults I can tune:

| Setting | Default |
| --- | --- |
| advanceThreshold | 0.90 |
| repeatThreshold | 0.80 |
| normalStep | 0.10 |
| reducedStep | 0.05 |
| minStepMiles (normal / reduced) | 0.5 / 0.25 |
| recoveryEvery | 4 weeks |
| recoveryFactor | 0.75 |
| taperFactor | 0.70 |
| longRunMaxShare | 0.50 |
| longRunStepMiles | 1 |
| painThreshold | open question |

## 4. Outputs

```ts
type Decision = 'advance' | 'repeat' | 'stepBack' | 'recovery' | 'taper' | 'race';

type WeekTarget = {
  weekIndex: number;
  targetMiles: number;
  longRunMiles: number;
};

type GateResult = {
  next: WeekTarget;
  decision: Decision;
  reducedMode: boolean; // true while progression is +5% instead of +10%
  reason: string;       // plain English, shown in the UI
};

type GoalCheck = {
  onTrack: boolean;
  gapMiles: number;     // curve target minus what the capped path can reach
  reachablePeakMiles: number;
};
```

Functions to write:

- `buildTargetCurve(startMiles, peakMiles, weeks): number[]`
- `reachablePeak(startMiles, weeks, config): number` (what the +10% cap allows)
- `gate(lastWeek, curve, state, config): GateResult`
- `goalCheck(curve, actuals, config): GoalCheck`

## 5. How it works

Target curve (built once, rebuilt if the plan changes):

1. The plan has `totalWeeks` weeks (19 from Nov 9). Week 1 is the starting target: at most 110% of last week's actual miles.
2. Weeks climb in 4-week cycles: three weeks up, then a recovery week at 75% of the last up week. After a recovery week, the next week resumes from the week before it.
3. The peak is reached in week 15 and repeated in week 17 (after the week 16 recovery). The growth per step is solved so the curve hits the peak without passing the +10% cap. If the cap can't reach the peak, the peak is lowered to what is reachable and `goalCheck` reports the gap.
4. Week 18 (taper) is 70% of peak. Week 19 (race week) is a fixed light week, about 8 miles plus the race.

Weekly gate, using `ratio = actual / target`:

| Ratio | Pain | Decision | Next target |
| --- | --- | --- | --- |
| 0.90 or more | at or under threshold | advance | min(curve next, max(actual × 1.10, actual + 0.5)) |
| 0.80 to 0.90 | at or under | repeat | same target |
| under 0.80 | any | stepBack | actual miles; reduced mode on (+5%) |
| any | over threshold | stepBack | 0.70 × this week's target; long run does not grow; reduced mode on |
| recovery week | n/a | recovery | 0.75 × previous week; next advance starts from the week before the recovery |
| taper / race | n/a | taper / race | fixed fractions of peak, no gate |

Reduced mode turns off after two weeks in a row with ratio at or above 0.90.

Long run: next long run is at most the last non-recovery long run + 1 mile, and at most 50% of next week's miles.

Goal check: simulate the capped path from the current week to the peak week. If the reachable peak is less than about 90% of the curve's peak, report `onTrack: false` with the gap in miles.

## 6. Edge cases

Decision: throw `RangeError` on bad numbers. The UI validates first, so a throw means a bug.

- [ ] Negative miles, NaN, or Infinity: throw
- [ ] Pain score outside 0 to 10: throw
- [ ] Plan has fewer weeks than the 4-week cycle layout needs: the curve starts partway through a cycle
- [ ] No history yet (first week): no gate; use the curve's week 1
- [ ] A skipped week (actual is 0): ratio 0, so stepBack
- [ ] Actual far above target (say 130%): advance, but the +10% cap applies to actual, and the reason says I overshot
- [ ] Starting miles of 0: first step uses the minimum step

## 7. Test plan

Write these before the implementation.

Gate examples:

| Target | Actual | Pain | Curve next | Expected |
| --- | --- | --- | --- | --- |
| 10 | 10 | low | 12 | advance, next 11.0 |
| 10 | 9.0 | low | 12 | advance (ratio 0.90 is the boundary), next 9.9 |
| 10 | 8.5 | low | 12 | repeat, next 10 |
| 10 | 7.0 | low | 12 | stepBack, next 7.0, reduced mode on |
| 10 | 10 | high | 12 | stepBack, next 7.0 |
| 4 | 4 | low | 6 | advance, next 4.5 (minimum step) |

Curve and goal check:

- [ ] Recovery weeks 4, 8, 12, and 16 are 75% of the last up week
- [ ] Peak is reached in week 15 and repeated in week 17; taper (week 18) is 70% of peak
- [ ] After a recovery week, advance starts from the week before it
- [ ] `reachablePeak(8, 15 weeks)` is about 22.8 and `reachablePeak(5, 15 weeks)` is about 14.3 (11 steps of +10%; verify by hand in the test comments)
- [ ] A 22-mile peak from an 8-mile start gives `onTrack: true`; from 5 miles it gives `onTrack: false`

Other tests:

- [ ] Reduced mode turns on after a stepBack and off after two good weeks
- [ ] Long run never grows by more than 1 mile or past 50% of the week
- [ ] Every edge case in section 6 behaves as specified
- [ ] Bigger actual never gives a smaller next target (monotonic, ignoring recovery weeks)

## 8. Done when

- [ ] All tests in section 7 pass in CI
- [ ] Types exported from `src/engine/types.ts`
- [ ] I can explain every function without looking at the code
- [ ] Entry added to `docs/ai-log.md`

## 9. Open questions

- Pain threshold: what number do I agree with my physio or doctor? (Placeholder idea: 3 out of 10.)
- Peak weekly miles: default 22 for the 2:30 stretch (a typical beginner half plan peaks around 20 to 25). What do I set for a finish-healthy goal?
- Placeholder start: the 19-week calendar assumes a 10-mile week 1. Replace it with what the November 9 baseline supports.
- No separate prep weeks any more: a low baseline just shrinks the curve. Is that enough protection for the knee, or do I want an extra pain gate for weeks 1 to 4?
- Should `reason` strings live in the engine or the UI layer?
