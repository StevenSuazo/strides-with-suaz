/**
 * supabase.ts: AppStorage backed by your Supabase tables.
 *
 * createSupabaseStorage(client): AppStorage
 * Takes the client as an argument. Follows the same rules as the in-memory
 * version: validate first (a RangeError, nothing sent), saves replace by key
 * (upsert), reads come back sorted. user_id is never sent: the database fills
 * it from the signed-in user, and row level security hides everyone else's
 * rows. Signed out, every call fails with an Error.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'
import {
  availabilityToRow,
  checkInToRow,
  gateStateToRow,
  overrideToRow,
  rowToAvailability,
  rowToCheckIn,
  rowToGateState,
  rowToRun,
  rowToWeekResult,
  rowsToOverrides,
  runToRow,
  weekResultToRow,
} from './mapper'
import type { AppStorage } from './types'
import {
  checkAvailability,
  checkCheckIn,
  checkGateState,
  checkOverride,
  checkRun,
  checkWeekIndex,
  checkWeekResult,
} from './validate'

const storageError = (error: { message: string }): Error =>
  new Error(`storage: ${error.message}`)

export const createSupabaseStorage: (
  client: SupabaseClient<Database>,
) => AppStorage = (client) => ({
  getWeekResults: async () => {
    const { data, error } = await client
      .from('week_results')
      .select('*')
      .order('week_index')
    if (error) throw storageError(error)
    return data.map(rowToWeekResult)
  },
  saveWeekResult: async (result) => {
    checkWeekResult(result)
    const { error } = await client
      .from('week_results')
      .upsert(weekResultToRow(result), { onConflict: 'user_id,week_index' })
    if (error) throw storageError(error)
  },

  getGateState: async () => {
    const { data, error } = await client
      .from('gate_state')
      .select('*')
      .maybeSingle()
    if (error) throw storageError(error)
    return data ? rowToGateState(data) : undefined
  },
  saveGateState: async (state) => {
    checkGateState(state)
    const { error } = await client
      .from('gate_state')
      .upsert(gateStateToRow(state), { onConflict: 'user_id' })
    if (error) throw storageError(error)
  },

  getAvailability: async (weekIndex) => {
    checkWeekIndex(weekIndex)
    const { data, error } = await client
      .from('week_availability')
      .select('*')
      .eq('week_index', weekIndex)
      .maybeSingle()
    if (error) throw storageError(error)
    return data ? rowToAvailability(data) : undefined
  },
  saveAvailability: async (weekIndex, availability) => {
    checkWeekIndex(weekIndex)
    checkAvailability(availability)
    const { error } = await client
      .from('week_availability')
      .upsert(availabilityToRow(weekIndex, availability), {
        onConflict: 'user_id,week_index',
      })
    if (error) throw storageError(error)
  },

  getRuns: async () => {
    const { data, error } = await client
      .from('runs')
      .select('*')
      .order('date')
      .order('id')
    if (error) throw storageError(error)
    return data.map(rowToRun)
  },
  saveRun: async (run) => {
    checkRun(run)
    const { error } = await client
      .from('runs')
      .upsert(runToRow(run), { onConflict: 'user_id,id' })
    if (error) throw storageError(error)
  },

  deleteRun: async (id) => {
    const { error } = await client.from('runs').delete().eq('id', id)
    if (error) throw storageError(error)
  },

  getCheckIns: async () => {
    const { data, error } = await client
      .from('check_ins')
      .select('*')
      .order('date')
      .order('id')
    if (error) throw storageError(error)
    return data.map(rowToCheckIn)
  },
  saveCheckIn: async (checkIn) => {
    checkCheckIn(checkIn)
    const { error } = await client
      .from('check_ins')
      .upsert(checkInToRow(checkIn), { onConflict: 'user_id,id' })
    if (error) throw storageError(error)
  },

  deleteCheckIn: async (id) => {
    const { error } = await client.from('check_ins').delete().eq('id', id)
    if (error) throw storageError(error)
  },

  getOverrides: async () => {
    const { data, error } = await client.from('overrides').select('*')
    if (error) throw storageError(error)
    return rowsToOverrides(data)
  },
  saveOverride: async (runId, workoutId) => {
    checkOverride(runId, workoutId)
    const { error } = await client
      .from('overrides')
      .upsert(overrideToRow(runId, workoutId), { onConflict: 'user_id,run_id' })
    if (error) throw storageError(error)
  },
  deleteOverride: async (runId) => {
    const { error } = await client
      .from('overrides')
      .delete()
      .eq('run_id', runId)
    if (error) throw storageError(error)
  },
})
