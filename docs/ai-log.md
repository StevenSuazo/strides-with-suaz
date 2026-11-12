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
