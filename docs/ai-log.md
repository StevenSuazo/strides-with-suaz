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
