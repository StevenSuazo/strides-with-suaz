/**
 * validate.ts: checks shared by every storage implementation.
 *
 * Each function throws a RangeError naming the field, so bad data never
 * reaches the store. The in-memory and Supabase versions both call these.
 */
import type {
  CheckIn,
  GateState,
  PlanSetup,
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

/** The ranges allowed for a run's optional details (also used by the form). */
export const RUN_LIMITS = {
  durationSeconds: { min: 1, max: 86_400 },
  heartRate: { min: 30, max: 250 },
  cadence: { min: 40, max: 300 },
  effort: { min: 1, max: 10 },
} as const

const optionalWhole = (
  name: string,
  value: number | undefined,
  limit: { min: number; max: number },
): void => {
  if (value === undefined) return
  if (!Number.isInteger(value) || value < limit.min || value > limit.max) {
    fail(
      `${name} must be a whole number from ${limit.min} to ${limit.max}, got ${value}`,
    )
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
  optionalWhole('run duration', run.durationSeconds, RUN_LIMITS.durationSeconds)
  optionalWhole(
    'run average heart rate',
    run.avgHeartRate,
    RUN_LIMITS.heartRate,
  )
  optionalWhole('run max heart rate', run.maxHeartRate, RUN_LIMITS.heartRate)
  optionalWhole('run cadence', run.cadence, RUN_LIMITS.cadence)
  optionalWhole('run effort', run.effort, RUN_LIMITS.effort)
  if (
    run.avgHeartRate !== undefined &&
    run.maxHeartRate !== undefined &&
    run.maxHeartRate < run.avgHeartRate
  ) {
    fail('run max heart rate must be at least the average heart rate')
  }
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

const weekday = (name: string, value: string, day: number, label: string) => {
  if (new Date(`${value}T00:00:00Z`).getUTCDay() !== day) {
    fail(`${name} must be a ${label}, got ${value}`)
  }
}

export const checkPlanSetup = (setup: PlanSetup): void => {
  isoDate('plan start date', setup.startDate)
  isoDate('plan race date', setup.raceDate)
  weekday('plan start date', setup.startDate, 1, 'Monday')
  weekday('plan race date', setup.raceDate, 0, 'Sunday')
  if (setup.raceDate <= setup.startDate) {
    fail('plan race date must be after the start date')
  }
  if (!Number.isFinite(setup.startMiles) || setup.startMiles <= 0) {
    fail(`plan start miles must be more than 0, got ${setup.startMiles}`)
  }
  if (
    !Number.isFinite(setup.peakMiles) ||
    setup.peakMiles <= setup.startMiles
  ) {
    fail(
      `plan peak miles must be more than the start miles, got ${setup.peakMiles}`,
    )
  }
  if (
    !Number.isFinite(setup.startLongRunMiles) ||
    setup.startLongRunMiles <= 0
  ) {
    fail(
      `plan start long run must be more than 0, got ${setup.startLongRunMiles}`,
    )
  }
}
