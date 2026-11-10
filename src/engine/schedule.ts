/**
 * schedule.ts: spreads a week's runs across the days I can run.
 *
 * What it does: takes a week's target miles and which days are open, and
 * returns the runs: which day, easy or long, how many miles.
 *
 * placeRuns(weekTarget, availability, config?): ScheduleResult
 * - Day types: 'open' (all day), 'morning' (my shifts run noon to 9 p.m., so
 *   most days are mornings only), or 'off'. Friday is usually open.
 * - Morning-only days are normal run days, with a length cap so I finish
 *   before work (a 75-minute window means about an hour of running).
 * - At least 3 runs a week. Add a 4th when the target would make 3 runs too
 *   long.
 * - Long run goes on Friday. If Friday is off, use the open day with the most
 *   room around it.
 * - Rest day between runs where possible. No hard day next to the long run.
 * - Split the leftover miles across the easy runs, roughly equal and shorter
 *   than the long run.
 * - Short on days: stretch runs to keep the full mileage, up to a cap (no
 *   easy run over 40% of the week's miles, and none past the morning window).
 *   If the cap blocks the full mileage, keep runs at the cap and report
 *   shortByMiles. The gate then counts the shortfall.
 * - notes: a plain-English line whenever a rule bends, such as "Only two open
 *   days, so runs are longer this week."
 * - Edge cases: a week with no open days, only two open days, no open day
 *   before Friday, a target too small to split.
 *
 * Build this one last: it depends on the availability screen design.
 *
 * Tests: schedule.test.ts. Write them first.
 * Status: stub, throws until implemented.
 */
import type {
  Config,
  ScheduleResult,
  WeekAvailability,
  WeekTarget,
} from './types'

export const placeRuns: (
  weekTarget: WeekTarget,
  availability: WeekAvailability,
  config?: Config,
) => ScheduleResult = () => {
  throw new Error('placeRuns: not implemented')
}
