/**
 * planSetup.ts: helpers for the plan setup form.
 *
 * - weekdayName(date): 'Saturday' and so on.
 * - suggestStart(today, raceDate): the start date to suggest for a race.
 * - mondayOnOrAfter(date): the date itself if it is a Monday, else the next
 *   Monday. The form suggests it as the plan start.
 * - readPlanDraft(draft): reads the form's text boxes. It returns
 *   { setup } when everything is valid, { problem } with a plain-English
 *   message for the first thing wrong in a box that has been filled in, or {}
 *   when nothing is wrong yet but a box is still empty. The rules are the same
 *   ones checkPlanSetup enforces in storage, worded for a person.
 */
import type { IsoDate, PlanSetup } from '../engine/types'
import { MIN_PLAN_WEEKS } from '../storage/validate'
import { totalWeeksBetween } from './settings'

const MS_PER_DAY = 86_400_000

export type PlanDraft = {
  startDate: string
  raceDate: string
  startMiles: string
  peakMiles: string
  startLongRunMiles: string
}

export type DraftReading = { setup: PlanSetup } | { problem?: string }

const dayOf = (date: string): number => Date.parse(`${date}T00:00:00Z`)

const isRealDate = (value: string): boolean => {
  const time = dayOf(value)
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(time) &&
    new Date(time).toISOString().slice(0, 10) === value
  )
}

const weekday = (date: string): number => new Date(dayOf(date)).getUTCDay()

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const weekdayName = (date: IsoDate): string => DAY_NAMES[weekday(date)]

const addDays = (date: IsoDate, days: number): IsoDate =>
  new Date(dayOf(date) + days * MS_PER_DAY).toISOString().slice(0, 10)

const mondayOnOrBefore = (date: IsoDate): IsoDate =>
  addDays(date, -((weekday(date) + 6) % 7))

/**
 * A start date for a race: the Monday that makes a 19-week plan ending in the
 * race's week, or the coming Monday if that has already passed (a shorter
 * plan). Always a Monday.
 */
export const suggestStart = (
  today: IsoDate,
  raceDate: IsoDate,
  weeks = 19,
): IsoDate => {
  const ideal = addDays(mondayOnOrBefore(raceDate), -(weeks - 1) * 7)
  const earliest = mondayOnOrAfter(today)
  return ideal >= earliest ? ideal : earliest
}

export const mondayOnOrAfter = (date: IsoDate): IsoDate => {
  const daysAhead = (8 - weekday(date)) % 7
  return new Date(dayOf(date) + daysAhead * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)
}

const blank = (text: string): boolean => text.trim() === ''

const positive = (text: string): number | undefined => {
  const value = Number(text)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export const readPlanDraft = (draft: PlanDraft): DraftReading => {
  const { startDate, raceDate } = draft
  const startFilled = !blank(startDate)
  const raceFilled = !blank(raceDate)
  const startReal = startFilled && isRealDate(startDate)
  const raceReal = raceFilled && isRealDate(raceDate)
  const startMiles = positive(draft.startMiles)
  const peakMiles = positive(draft.peakMiles)
  const longRun = positive(draft.startLongRunMiles)

  let problem: string | undefined
  if (startFilled && !startReal) problem = 'The start needs to be a real date.'
  else if (startReal && weekday(startDate) !== 1) {
    problem = 'The start date must be a Monday.'
  } else if (raceFilled && !raceReal) {
    problem = 'The race needs to be a real date.'
  } else if (startReal && raceReal && raceDate <= startDate) {
    problem = 'The race has to come after the start.'
  } else if (
    startReal &&
    raceReal &&
    totalWeeksBetween(startDate, raceDate) < MIN_PLAN_WEEKS
  ) {
    problem = `The plan needs at least ${MIN_PLAN_WEEKS} weeks from start to race.`
  } else if (!blank(draft.startMiles) && startMiles === undefined) {
    problem = 'Starting miles must be a number above 0.'
  } else if (!blank(draft.peakMiles) && peakMiles === undefined) {
    problem = 'Peak miles must be a number above 0.'
  } else if (
    peakMiles !== undefined &&
    startMiles !== undefined &&
    peakMiles <= startMiles
  ) {
    problem = 'Peak miles must be more than your starting miles.'
  } else if (!blank(draft.startLongRunMiles) && longRun === undefined) {
    problem = 'Starting long run must be a number above 0.'
  }
  if (problem) return { problem }

  if (
    !startReal ||
    !raceReal ||
    startMiles === undefined ||
    peakMiles === undefined ||
    longRun === undefined
  ) {
    return {}
  }
  return {
    setup: {
      startDate,
      raceDate,
      startMiles,
      peakMiles,
      startLongRunMiles: longRun,
    },
  }
}
