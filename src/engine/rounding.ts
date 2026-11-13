/**
 * rounding.ts: rounds miles to the nearest tenth, so the UI never shows
 * 4.300000000000001.
 *
 * roundMiles(value)
 * - Exact halves round up (4.25 gives 4.3), the same as Math.round.
 * - NaN or Infinity throw a RangeError.
 */

export const roundMiles: (value: number) => number = (value) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`roundMiles: expected a finite number, got ${value}`)
  }
  return Math.round(value * 10) / 10
}
