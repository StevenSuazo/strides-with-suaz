/**
 * rounding.ts: clean miles output.
 *
 * What it does: rounds a distance to the nearest tenth of a mile so the UI and
 * the tests never show 4.300000000000001.
 *
 * roundMiles(value)
 * - Input: any finite number of miles. Output: that number to one decimal.
 * - Exact halves round up (4.25 gives 4.3), the same as Math.round.
 * - Throw a RangeError for NaN or Infinity.
 *
 * Tests: rounding.test.ts. Write them first.
 * Status: done.
 */

export const roundMiles: (value: number) => number = (value) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`roundMiles: expected a finite number, got ${value}`)
  }
  return Math.round(value * 10) / 10
}
