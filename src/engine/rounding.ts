/**
 * rounding.ts: clean miles output.
 *
 * What it does: rounds a distance to the nearest tenth of a mile so the UI and
 * the tests never show 4.300000000000001.
 *
 * roundMiles(value)
 * - Input: any finite number of miles. Output: that number to one decimal.
 * - Decide the rule for exact halves (4.25) and write it in the test.
 * - Throw a RangeError for NaN or Infinity.
 *
 * Tests: rounding.test.ts. Write them first.
 * Status: stub, throws until implemented.
 */

export const roundMiles: (value: number) => number = () => {
  throw new Error('roundMiles: not implemented')
}
