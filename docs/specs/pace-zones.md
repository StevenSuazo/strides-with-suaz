# Spec: Pace zones

Status: deferred (post-MVP; revisit after the January 8 time trial). Replaced for v1 by weekly-progression.md
Owner: me
Branch: feat/weekly-progression
Code lives in: `src/engine/` (pure TypeScript, no React, no network)

## 1. Goal

One or two sentences: what does this feature do, and why does the app need it?

It turns one recent race result into the training paces every workout uses.

## 2. Non-goals

What this feature deliberately does NOT do. Keeping this short prevents scope creep.

- [ ] No UI and no form parsing. The engine takes numbers only.
- [ ] No plan generation, only paces
- [ ] No heart-rate or effort zones in v1.
- [ ] No race-time prediction, and no support for marathon or ultra distances in v1.

## 3. Inputs

Describe each input, its type, its unit, and what counts as valid.

| Input         | Type                      | Unit                                                         | Valid range                                       |
| ------------- | ------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Race distance | `'5K' \| '10K' \| 'half'` | meters (5000 ≈ 3.11 mi, 10000 ≈ 6.21 mi, 21097.5 ≈ 13.11 mi) | only these three                                  |
| Race time     | `number`                  | seconds                                                      | positive, finite, and a sane pace (see section 6) |

Decision: support 5K, 10K, and half marathon in v1. A half-marathon app needs exactly those, and the formulas are shaky outside roughly 3.5 minutes to 4 hours.

- The distance type is a string union that maps to meters, so a bad value like "21000" can't slip in.
- Half marathon is exactly 21097.5 m, which is 13.1094 miles (the familiar "13.1").
- Distances are stored in meters and converted to miles only for display. The Daniels formulas need meters per minute, so meters is the natural internal unit.

Conversions used throughout: 1 mile = 1609.344 m = 1.609344 km.

## 4. Outputs

Describe the `PaceZones` object.

- Zones included: easy, half marathon, threshold, interval, repetition. (Daniels' own system has a marathon zone rather than a half-marathon one. This app is for half-marathoners, so it has a half zone.)
- Every zone is a range `{ slow, fast }`, using one uniform type. Easy is a real range, and the other zones use a narrow band. The UI and plan code never need to branch on zone type.
- Unit rule: store pace as **seconds per kilometer** (1 km ≈ 0.6214 mi) internally. Convert to minutes per mile **only for display**.
- Time is seconds in and seconds out. Convert to minutes only inside the VDOT formulas, because they need minutes.

Conversions (keep them in one helper so the internal unit stays cheap to change):

- Display: `minPerMile = secPerKm × 1.609344 / 60`. Example: 300 sec/km (5:00/km) is 8:03 per mile.
- Reverse: `secPerKm = minPerMile × 60 / 1.609344`.
- Speed for the formulas: for a pace in min/mile, `v` in meters per minute is `1609.344 / minPerMile`. Example: 8:00/mile is about 201.2 m/min.

```ts
type RaceDistance = '5K' | '10K' | 'half'

type RaceResult = {
  distance: RaceDistance
  timeSeconds: number
}

type PaceRange = {
  slowSecPerKm: number // larger number = slower
  fastSecPerKm: number
}

type ZoneName =
  'easy' | 'halfMarathon' | 'threshold' | 'interval' | 'repetition'

type PaceZones = {
  vdot: number
  zones: Record<ZoneName, PaceRange>
}
```

## 5. How it works

Write the steps in plain English before any code.

1. Convert the race result to speed (meters per minute).
2. Compute oxygen cost at that speed.
3. Compute the fraction of max effort sustainable for that race duration.
4. VDOT = step 2 divided by step 3.
5. For each zone: pick an intensity range, multiply by VDOT, solve for speed, convert to pace.

Formulas (Daniels and Gilbert), with `v` in meters per minute and `t` in minutes:

- Oxygen cost: `-4.60 + 0.182258·v + 0.000104·v²`
- Sustainable fraction: `0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)`

Solving speed from oxygen cost (step 5): rearrange to `0.000104v² + 0.182258v − (4.60 + VO2) = 0` and take the positive root of the quadratic formula. The result is in m/min. Convert to sec/km with `60000 / v`, or to min/mile with `1609.344 / v`.

Zone intensity table. Percentages are from memory of Daniels' _The Running Formula_. **Verify against the book before relying on them.**

| Zone          | Share of VDOT (low) | Share of VDOT (high) | Source                                                                                          |
| ------------- | ------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| Easy          | 0.59                | 0.74                 | Daniels, E pace (59–74% of VO2max)                                                              |
| Half marathon | derived             | derived              | see below                                                                                       |
| Threshold     | 0.83                | 0.88                 | Daniels, T pace (88% is the classic single value)                                               |
| Interval      | 0.95                | 1.00                 | Daniels, I pace (about 98% is typical)                                                          |
| Repetition    | ~1.05               | ~1.10                | Approximate. Daniels defines R by speed, not by %VO2max, so this is the soft spot in the table. |

Half marathon zone: don't use a table value. Predict it. Given a VDOT, find the race time `t` where `oxygenCost(v) / fraction(t) = VDOT`, and use that pace. `t` appears on both sides, so this needs a small bisection loop. Fallback: about 84–86% of VDOT, which is close for 90–120 minute finishes.

Sanity check at VDOT 50:

| Zone                 | Per km | Per mile |
| -------------------- | ------ | -------- |
| Easy, slow end (59%) | 5:52   | 9:26     |
| Easy, fast end (74%) | 4:54   | 7:52     |
| Threshold (88%)      | 4:15   | 6:51     |

## 6. Edge cases

What should the function do in each case: return an error, clamp, or return null?

Decision: throw. The UI validates first, so a throw means a programming bug and carries a useful message. (Alternative if exceptions feel wrong: a `{ ok: false, error }` result type.)

- [ ] Time is zero, negative, NaN, or Infinity: throw `RangeError`
- [ ] Distance is unsupported: blocked at compile time by the type, plus a runtime throw for untyped form data
- [ ] Result implies an unrealistic pace: compute the VDOT and throw if it's outside about 15–85. The floor must allow VDOT 21 (5K in 41:00). 85 is roughly world-record territory.
- [ ] Time given as 41:00 vs 2460 seconds vs "41": parsing happens in the UI layer. The engine only receives seconds as a number.

## 7. Test plan

Write these before the implementation.

Anchor cases. Use ±0.1 against published tables (they round to 0.1) and ±0.01 against values computed from the formula.

| Race                  | Computed VDOT | Notes                         |
| --------------------- | ------------- | ----------------------------- |
| 5K in 41:00           | 21.02         |                               |
| Half marathon in 2:30 | 27.89         |                               |
| 5K in 25:00           | 38.31         | published table is about 38.3 |
| 5K in 20:00           | 49.81         | published table is about 49.8 |
| 10K in 40:00          | 51.94         | published table is about 51.9 |
| 10K in 50:00          | 40.01         |                               |
| Half marathon in 1:30 | 50.98         |                               |

The computed values come from the same formula the code uses, so they only prove the code matches the formula. **TODO:** confirm 2 or 3 rows against a published VDOT table (Daniels' book or an online VDOT calculator) to prove the formula matches the real world.

Published pace tables start around VDOT 30, so VDOT 21 has nothing to check against. Use a VDOT of 40 or more when testing zone paces.

Other tests:

- [ ] Faster race gives a higher VDOT
- [ ] Zones are ordered: easy slower than half marathon, slower than threshold, and so on
- [ ] Each edge case in section 6 behaves as specified
- [ ] Unit conversion round trip (seconds per km to minutes per mile and back). Cases: 300 sec/km ↔ 8:03/mile (8.05 min/mile), and a 1609.344 m run in 8:00 must come out as 8:00/mile.

## 8. Done when

- [ ] All tests in section 7 pass in CI
- [ ] Types exported from `src/engine/types.ts`
- [ ] I can explain every function without looking at the code
- [ ] Entry added to `docs/ai-log.md`

## 9. Open questions

Anything I need to look up or decide. Delete the ones I resolve.

- Verify the zone percentages (especially repetition) against Daniels' book.
- Confirm 2 or 3 anchor VDOTs against a published table.
- Throw vs result type for invalid input (currently: throw).
- Add the marathon distance later?
