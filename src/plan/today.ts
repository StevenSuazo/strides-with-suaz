/**
 * today.ts: today's date in your own time zone.
 *
 * todayIso(now?): 'YYYY-MM-DD' from the local clock. toISOString would give
 * the UTC date, which is already tomorrow for an evening run in New York.
 */
import type { IsoDate } from '../engine/types'

const pad = (value: number): string => String(value).padStart(2, '0')

export const todayIso = (now: Date = new Date()): IsoDate =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
