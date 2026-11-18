/**
 * days.ts: two small date helpers for the plan code.
 *
 * - assertDate(name, date): throws a RangeError unless date is a real
 *   YYYY-MM-DD day. The name says which input was bad.
 * - previousDay(date): the day before, in UTC so a daylight-saving change
 *   cannot shift it.
 */
import type { IsoDate } from '../engine/types'

const DAY_MS = 86_400_000

export const assertDate = (name: string, date: IsoDate): void => {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(
      `${name} must be a real date like 2026-11-09, got ${date}`,
    )
  }
}

export const previousDay = (date: IsoDate): IsoDate => {
  assertDate('date', date)
  return new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS)
    .toISOString()
    .slice(0, 10)
}
