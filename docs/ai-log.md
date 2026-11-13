## 2026-11-10: engine skeleton, rounding, dates, week structure

**What I built**

- Engine skeleton in `src/engine/` (types, config, stubs, `it.todo` tests)
- `roundMiles`, the date helpers (`daysUntilRace`, `weekIndexForDate`,
  `weekStartDate`), and `getWeekKind` / `isRecoveryWeek`

**How I used AI**

- Claude drafted the skeleton from my spec; I reviewed it and ran CI.
- For the implementations, Claude coached me through test-first. I typed the
  code and ran the tests myself, and Claude reviewed each file.

**Decisions I made**

- Exact halves round up (4.25 becomes 4.3)
- Dates are ISO strings and all date math is in UTC, so daylight saving
  can't shift a week
- Bad input throws a `RangeError` instead of returning a quiet wrong answer
- When rules overlap, the order is race, taper, recovery, peak, build

**What went wrong**

- VS Code's "Add missing function" quick fix generated a fake `expect`.
  Vitest still passed because it doesn't type-check, but `tsc` failed, so CI
  would have too.
- I put a test in the wrong `describe` block and overwrote another one by
  accident. I caught both from the test output (the label and the test count).
- Claude's warning about function order in `weekStructure.ts` was too
  cautious; I checked and it wasn't a problem.

**What I learned**

- Red, green, repeat: write a failing test, write the least code, then add
  the next test
- Guard clauses: reject bad input first, with an error message that names
  the value
- Tests that pass immediately need a break-it check, because you never saw
  them fail
- Test output is a debugging tool: labels and counts show where things went
  wrong

## 2026-11-11: longRun

**What I built**

- `nextLongRun(lastLongRun, weekMiles, config?)`: the long run grows by at
  most 1 mile and never goes over 50% of the week's miles. 10 tests.

**How I used AI**

- I wrote `longRun.ts` and its tests myself, working from the header comment.
  Claude reviewed the file and the tests afterwards.
- This one went faster than the earlier files: I wrote all the tests in one
  pass instead of one red-green step at a time.

**Decisions I made**

- When the 50% cap is below the last long run, the cap wins and the long run
  can shrink on a short week. The share is a safety limit, not a target.
- The result goes through `roundMiles`, so the cap and the step are both
  rounded to a tenth of a mile.
- Bad input (negative, `NaN`, `Infinity`) throws a `RangeError`, with a small
  private helper that names which input was bad.

**What went wrong**

- My floating-point test passed for the wrong reason. `0.1 + 1` is exactly
  `1.1`, so the test would have passed without `roundMiles` at all. Claude
  flagged it, and I checked in node. I replaced it with `0.1 + 0.2`, which
  does produce noise (`0.30000000000000004`), and did a break-it check.
- I created `feat/long-run` from `main` before the `weekStructure` PR had
  been merged. The test output showed `weekStructure` as all todo when it
  should have been passing, and `git log` confirmed the branch was missing it.
- The header still had a "decide / probably" line after the decision was
  made. Stale wording like that is easy to miss, so I now search the header
  for "decide", "probably" and "TBD" at the end of each file.

**What I learned**

- A test that passes on the first run needs a break-it check: change the
  code so it should fail, and confirm it does.
- `npm run format:check` checks the whole repo, so run it before every push,
  not just `prettier --write src/engine`.
- Read the test output closely: counts, labels and "todo" numbers showed me
  two mistakes (a missing branch and a misplaced test) before CI did.

## 2026-11-12: targetCurve

**What I built**

- `reachablePeak(startMiles, weeks)`: the highest weekly miles the +10% cap
  can reach, with a 0.5 mile minimum step. 7 tests.
- `buildTargetCurve(startMiles, peakMiles, totalWeeks)`: one target per week,
  with recovery weeks, the peak in weeks 15 and 17, the taper, and race week.
  15 tests.

**How I used AI**

- Claude planned the file with real numbers before any code: the 19-week
  staircase for an 8-mile start, and a table of the highest peak each
  starting mileage can reach (10 miles gives 28.5, 8 gives 22.8, 5 gives 14.3,
  4 gives 11.8).
- [Say what you did yourself here: for example, "I wrote the code and the
  tests, then Claude reviewed them", or which parts came from a suggestion.]
- Claude reviewed the finished file by running it and the tests, not just by
  reading it.

**Decisions I made**

- The minimum step (0.5 mile) is a floor on the cap, not a forced step. Each
  step may add up to the larger of 10% and 0.5 mile.
- The curve is solved as a fraction (0 to 1) of the allowed step, found by
  repeatedly halving the range. It works from a start of 0, and the cap can
  never be broken. [Note whether this was your idea or a suggestion.]
- If the cap can't reach the requested peak, the peak is lowered to what it
  can reach, and `goalCheck` will report the gap.
- Race week is a fixed `raceWeekMiles` (8).

**What went wrong**

- `format:check` failed on trailing spaces in the test file. I only ran
  Prettier on `src/engine` earlier, and CI checks the whole repo.
- Edits to `longRun.ts` and its tests were sitting uncommitted on my
  `feat/target-curve` branch. They were left over from the previous branch,
  and `git status` showed them before I committed. They belong in their own
  change.
- A test slack Claude suggested (0.05 mile) was too tight. Both weeks are
  rounded, so the error can reach 0.1, and my `0.1` was correct.
- Race week can be bigger than the taper week for low starting miles. From a
  start of 2, the last weeks come out as 8.1, 6, 8.1, 5.6, 8. It doesn't
  matter for my real start of 4, but I noticed it in review, not while
  writing the tests.

**What I learned**

- Check `git status` before committing. Uncommitted edits follow you when you
  switch branches.
- A planned algorithm isn't always the best one. The fraction-of-step idea
  handled a start of 0, which a constant growth ratio can't.
- Hand-check test numbers against an independent calculation. The curve for my
  own start of 4 is 4, 4.5, 5, 3.8, 5.5 ... 11.8 at the peak, and it can't
  reach the 22-mile target.
- A realistic test case (my real start) is worth having next to the edge
  cases.
