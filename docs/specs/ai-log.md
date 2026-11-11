11-10-2027:
- Used Claude to walk through test-first for rounding and dates, got stuck on a VS Code auto-generated expect
- Red, green, repeat. Write a failing test, write the least code, then add the next test.
- Guard clauses. Reject bad input first, with an error message that names the value.
- UTC for date math, so daylight saving can’t shift a day.
- Tests that pass immediately need a break-it check, because you never saw them fail.