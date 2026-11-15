/**
 * schedule.ts: spreads a week's runs across the days I can run.
 *
 * placeRuns(weekTarget, availability, config?): ScheduleResult
 * - Days are 'open', 'morning' (runs capped at config.morningMaxMiles) or 'off'.
 * - The long run goes on Friday if it is open, otherwise on the open day with
 *   the most room around it (then closest to Friday). With no open day it
 *   uses a morning day and is cut to the morning cap.
 * - 3 runs a week, 4 when 3 cannot carry the miles. Easy runs split what is
 *   left evenly, capped at 40% of the week (and the morning cap), and
 *   rounded down to a tenth.
 * - Runs get a rest day between them where possible.
 * - Miles the caps block come back as shortByMiles. A small week uses fewer
 *   runs so none is under config.minRunMiles. A week with nothing to run on
 *   returns no runs.
 * - notes: a plain-English line whenever a rule bends.
 */
import { DEFAULT_CONFIG } from './config'
import { roundMiles } from './rounding'
import type {
  Config,
  DayAvailability,
  PlannedRun,
  ScheduleResult,
  WeekAvailability,
  WeekTarget,
} from './types'

const FRIDAY = 4

const pickLongDay = (availability: WeekAvailability): number | undefined => {
  if (availability[FRIDAY] === 'open') return FRIDAY

  const daysOf = (kind: DayAvailability): number[] =>
    availability
      .map((type, dayIndex) => ({ type, dayIndex }))
      .filter(({ type }) => type === kind)
      .map(({ dayIndex }) => dayIndex)

  const room = (day: number): number =>
    [day - 1, day + 1].filter(
      (neighbor) =>
        availability[neighbor] !== 'open' &&
        availability[neighbor] !== 'morning',
    ).length

  const best = (days: number[]): number =>
    [...days].sort(
      (a, b) =>
        room(b) - room(a) ||
        Math.abs(a - FRIDAY) - Math.abs(b - FRIDAY) ||
        a - b,
    )[0]

  const openDays = daysOf('open')
  if (openDays.length > 0) return best(openDays)
  if (availability[FRIDAY] === 'morning') return FRIDAY
  const morningDays = daysOf('morning')
  return morningDays.length > 0 ? best(morningDays) : undefined
}

const splitMiles = (total: number, parts: number): number[] => {
  const shares: number[] = []
  let placed = 0
  for (let i = 0; i < parts - 1; i++) {
    const share = roundMiles(total / parts)
    shares.push(share)
    placed += share
  }
  shares.push(roundMiles(total - placed))
  return shares
}

const pickEasyDays = (
  availability: WeekAvailability,
  longDay: number,
  count: number,
): number[] => {
  const candidates = availability
    .map((type, dayIndex) => ({ type, dayIndex }))
    .filter(({ type, dayIndex }) => type !== 'off' && dayIndex !== longDay)
    .map(({ dayIndex }) => dayIndex)

  const chosen: number[] = []
  for (const day of candidates) {
    if (chosen.length === count) break
    const touchesARun = [...chosen, longDay].some(
      (taken) => Math.abs(taken - day) === 1,
    )
    if (!touchesARun) chosen.push(day)
  }
  for (const day of candidates) {
    if (chosen.length === count) break
    if (!chosen.includes(day)) chosen.push(day)
  }
  return chosen.sort((a, b) => a - b)
}

const floorTenth = (miles: number): number => Math.floor(miles * 10 + 1e-9) / 10

const allocate = (
  total: number,
  caps: number[],
): { miles: number[]; shortBy: number } => {
  const miles = caps.map(() => 0)
  let open = caps.map((_, i) => i)
  let remaining = total
  for (;;) {
    if (open.length === 0) return { miles, shortBy: roundMiles(remaining) }
    const share = remaining / open.length
    const clamped = open.filter((i) => caps[i] < share)
    if (clamped.length === 0) break
    clamped.forEach((i) => {
      miles[i] = caps[i]
      remaining -= caps[i]
    })
    open = open.filter((i) => !clamped.includes(i))
  }
  splitMiles(remaining, open.length).forEach((share, k) => {
    miles[open[k]] = share
  })
  return { miles, shortBy: 0 }
}

const oneDecimal = (miles: number): string => miles.toFixed(1)

export const placeRuns: (
  weekTarget: WeekTarget,
  availability: WeekAvailability,
  config?: Config,
) => ScheduleResult = (weekTarget, availability, config = DEFAULT_CONFIG) => {
  const longDay = pickLongDay(availability)
  if (longDay === undefined) {
    return {
      runs: [],
      shortByMiles: roundMiles(weekTarget.targetMiles),
      notes: ['No days are available to run this week.'],
    }
  }

  const notes: string[] = []
  const longMiles =
    availability[longDay] === 'morning'
      ? Math.min(weekTarget.longRunMiles, floorTenth(config.morningMaxMiles))
      : weekTarget.longRunMiles
  if (longMiles < weekTarget.longRunMiles) {
    notes.push(
      `The long run is cut to ${oneDecimal(longMiles)} miles because only a morning is free.`,
    )
  }
  const longRun: PlannedRun = {
    dayIndex: longDay,
    kind: 'long',
    miles: longMiles,
  }

  const leftover = Math.max(0, weekTarget.targetMiles - longMiles)
  const fewestEasy = config.minRunsPerWeek - 1
  let wanted = fewestEasy
  while (wanted > 1 && leftover / wanted < config.minRunMiles) wanted--
  const smallWeek = wanted < fewestEasy

  const shareCap = smallWeek
    ? Infinity
    : weekTarget.targetMiles * config.easyRunMaxShare
  const capFor = (dayIndex: number): number =>
    floorTenth(
      availability[dayIndex] === 'morning'
        ? Math.min(shareCap, config.morningMaxMiles)
        : shareCap,
    )

  let easyDays: number[] = []
  let plan = allocate(leftover, [])
  const mostEasy = smallWeek ? wanted : wanted + 1
  for (let count = wanted; count <= mostEasy; count++) {
    easyDays = pickEasyDays(availability, longDay, count)
    plan = allocate(leftover, easyDays.map(capFor))
    if (plan.shortBy === 0) break
  }

  const easyRuns: PlannedRun[] = easyDays.map((dayIndex, i) => ({
    dayIndex,
    kind: 'easy',
    miles: plan.miles[i],
  }))
  const runs = [...easyRuns, longRun].sort((a, b) => a.dayIndex - b.dayIndex)

  if (smallWeek) {
    notes.push(
      `The target is small, so this week has ${runs.length} runs of at least ${oneDecimal(config.minRunMiles)} mile.`,
    )
  }
  if (easyDays.length < wanted) {
    notes.push(
      `Only ${runs.length} run days are available, so runs are longer this week.`,
    )
  }
  if (easyDays.length > fewestEasy) {
    notes.push(
      `The target is too big for ${config.minRunsPerWeek} runs, so this week has ${runs.length} runs.`,
    )
  }
  if (
    runs.some((run, i) => i > 0 && run.dayIndex - runs[i - 1].dayIndex === 1)
  ) {
    notes.push(
      'There are not enough spread-out days, so some runs are back to back.',
    )
  }
  if (plan.shortBy > 0) {
    notes.push(
      `Only ${oneDecimal(weekTarget.targetMiles - plan.shortBy)} of ${oneDecimal(weekTarget.targetMiles)} miles fit, so this week is ${oneDecimal(plan.shortBy)} miles short.`,
    )
  }

  return { runs, shortByMiles: plan.shortBy, notes }
}
