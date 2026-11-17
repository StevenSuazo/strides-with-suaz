/**
 * validate.ts: checks shared by every storage implementation.
 *
 * Each function throws a RangeError naming the field, so bad data never
 * reaches the store. The in-memory and Supabase versions both call these.
 */
import type {
  CheckIn,
  GateState,
  Run,
  WeekAvailability,
  WeekResult,
} from '../engine/types'

const fail = (message: string): never => {
  throw new RangeError(`storage: ${message}`)
}

const miles = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    fail(`${name} must be a finite number of miles, 0 or more, got ${value}`)
  }
}

const wholeNumber = (name: string, value: number, min: number): void => {
  if (!Number.isInteger(value) || value < min) {
    fail(`${name} must be a whole number, ${min} or more, got ${value}`)
  }
}

const pain = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    fail(`${name} must be a whole number from 0 to 10, got ${value}`)
  }
}

const isoDate = (name: string, value: string): void => {
  const time = Date.parse(`${value}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  ) {
    fail(`${name} must be a real date like 2026-11-09, got ${value}`)
  }
}

const nonEmpty = (name: string, value: string): void => {
  if (value === '') fail(`${name} must not be empty`)
}

export const checkWeekIndex = (weekIndex: number): void =>
  wholeNumber('weekIndex', weekIndex, 1)

export const checkWeekResult = (result: WeekResult): void => {
  checkWeekIndex(result.weekIndex)
  miles('targetMiles', result.targetMiles)
  miles('actualMiles', result.actualMiles)
  miles('longRunMiles', result.longRunMiles)
  pain('highestPain', result.highestPain)
}

export const checkGateState = (state: GateState): void => {
  wholeNumber('goodWeeksInRow', state.goodWeeksInRow, 0)
  miles('lastLongRunMiles', state.lastLongRunMiles)
  if (state.weekBeforeRecovery) checkWeekResult(state.weekBeforeRecovery)
}

export const checkAvailability = (availability: WeekAvailability): void => {
  if (availability.length !== 7) {
    fail(`availability must have 7 days, got ${availability.length}`)
  }
  availability.forEach((day) => {
    if (day !== 'open' && day !== 'morning' && day !== 'off') {
      fail(`availability day must be open, morning or off, got ${day}`)
    }
  })
}

export const checkRun = (run: Run): void => {
  nonEmpty('run id', run.id)
  isoDate('run date', run.date)
  miles('run miles', run.miles)
}

export const checkCheckIn = (checkIn: CheckIn): void => {
  nonEmpty('check-in id', checkIn.id)
  isoDate('check-in date', checkIn.date)
  checkIn.entries.forEach((entry) => pain('entry pain', entry.pain))
}

export const checkOverride = (runId: string, workoutId: string): void => {
  nonEmpty('override run id', runId)
  nonEmpty('override workout id', workoutId)
}
