/**
 * search.ts: finds half marathons through our own /api/races function.
 *
 * searchRaces(words, fetchImpl?): Promise<RaceChoice[]>
 * Asks the server (api/races.ts), which asks RunSignup, so no secret is ever
 * in the browser. Throws an Error with a plain message when the search fails:
 * the server's own message if it sent one, "Could not reach the race search."
 * when the network is down, or "Race search sent something unexpected." when
 * the answer is not a list of races.
 */
import type { IsoDate } from '../engine/types'

export type RaceChoice = {
  id: string
  name: string
  city: string
  state: string
  date: IsoDate
  url: string
}

const isRace = (value: unknown): value is RaceChoice => {
  if (typeof value !== 'object' || value === null) return false
  const race = value as Record<string, unknown>
  return ['id', 'name', 'city', 'state', 'date', 'url'].every(
    (key) => typeof race[key] === 'string',
  )
}

export const searchRaces = async (
  words: string,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): Promise<RaceChoice[]> => {
  let response: Response
  try {
    response = await fetchImpl(
      `/api/races?name=${encodeURIComponent(words.trim())}`,
    )
  } catch {
    throw new Error('Could not reach the race search.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Race search failed (${response.status}).`
    throw new Error(message)
  }
  if (!Array.isArray(body) || !body.every(isRace)) {
    throw new Error('Race search sent something unexpected.')
  }
  return body
}
