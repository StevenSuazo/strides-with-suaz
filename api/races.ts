/**
 * races.ts: a Vercel function that searches RunSignup for half marathons.
 *
 * GET /api/races?name=United+Half[&state=NY]
 * Returns a list of { id, name, city, state, date, url }, soonest first, or
 * { error } with a 400 (name too short) or 502 (RunSignup trouble).
 *
 * Why it lives on the server: from January 1, 2027 RunSignup wants every
 * caller registered, and that registration has a secret that must never ship
 * in browser code. The secrets come from environment variables and are all
 * optional until then: RUNSIGNUP_API_KEY and RUNSIGNUP_API_SECRET, and
 * RUNSIGNUP_REG_TOKEN and RUNSIGNUP_REG_SECRET (the API caller registration).
 *
 * RunSignup lists races, and some "races" are charity team pages, so the name
 * says little. A race counts as a half only if one of its events is about
 * 13.1 miles (21.1 km), and the date comes from that event.
 *
 * This file stands alone (no imports from src/) because Vercel builds each
 * function by itself. handleRaces and parseHalfRaces are plain functions so
 * they can be tested; the default export only adapts them to Node.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

export type RaceChoice = {
  id: string
  name: string
  city: string
  state: string
  date: string // YYYY-MM-DD
  url: string
}

type Env = Record<string, string | undefined>

const RUNSIGNUP = 'https://api.runsignup.com/rest/races'
const KM_PER_MILE = 1.609344
const MAX_RESULTS = 25

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const text = (value: unknown): string =>
  typeof value === 'string' ? value : ''

/** "13.1 Miles" or "21.1 K" in miles; undefined when it is not understood. */
const miles = (distance: unknown): number | undefined => {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)/i.exec(text(distance))
  if (!match) return undefined
  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit.startsWith('mi')) return value
  if (unit === 'k' || unit.startsWith('km') || unit.startsWith('kilo')) {
    return value / KM_PER_MILE
  }
  return undefined
}

const isHalf = (distance: unknown): boolean => {
  const value = miles(distance)
  return value !== undefined && value >= 13 && value <= 13.3
}

/** "3/21/2027 07:00" or "03/21/2027" as 2027-03-21. */
const isoDate = (value: unknown): string | undefined => {
  const match = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text(value))
  if (!match) return undefined
  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export const parseHalfRaces = (json: unknown, today: string): RaceChoice[] => {
  const races = record(json)?.races
  if (!Array.isArray(races)) return []

  const found = new Map<string, RaceChoice>()
  for (const entry of races) {
    const race = record(record(entry)?.race)
    if (!race) continue
    const events = Array.isArray(race.events) ? race.events : []
    const half = events
      .map(record)
      .find((event) => event && isHalf(event.distance))
    if (!half) continue

    const date = isoDate(half.start_time) ?? isoDate(race.next_date)
    const id = String(race.race_id ?? '')
    const name = text(race.name)
    if (!date || date < today || !id || !name) continue

    const address = record(race.address)
    found.set(id, {
      id,
      name,
      city: text(address?.city),
      state: text(address?.state),
      date,
      url: text(race.url),
    })
  }

  return [...found.values()]
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
    )
    .slice(0, MAX_RESULTS)
}

export const handleRaces = async ({
  query,
  env,
  fetchImpl,
  today,
}: {
  query: URLSearchParams
  env: Env
  fetchImpl: typeof fetch
  today: string
}): Promise<{ status: number; body: unknown }> => {
  const name = (query.get('name') ?? '').trim()
  if (name.length < 3) {
    return {
      status: 400,
      body: { error: 'Type at least 3 letters of the race name.' },
    }
  }

  const url = new URL(RUNSIGNUP)
  url.searchParams.set('format', 'json')
  url.searchParams.set('events', 'T')
  url.searchParams.set('name', name)
  url.searchParams.set('start_date', today)
  url.searchParams.set('results_per_page', '50')
  const state = (query.get('state') ?? '').trim()
  if (/^[A-Za-z]{2}$/.test(state)) {
    url.searchParams.set('state', state.toUpperCase())
  }

  const headers: Record<string, string> = {}
  if (env.RUNSIGNUP_API_KEY && env.RUNSIGNUP_API_SECRET) {
    url.searchParams.set('api_key', env.RUNSIGNUP_API_KEY)
    url.searchParams.set('api_secret', env.RUNSIGNUP_API_SECRET)
  }
  if (env.RUNSIGNUP_REG_TOKEN && env.RUNSIGNUP_REG_SECRET) {
    url.searchParams.set('rsu_api_reg', env.RUNSIGNUP_REG_TOKEN)
    headers['X-RSU-API-REG-SECRET'] = env.RUNSIGNUP_REG_SECRET
  }

  let response: Response
  try {
    response = await fetchImpl(url, { headers })
  } catch {
    return { status: 502, body: { error: 'Could not reach RunSignup.' } }
  }
  if (!response.ok) {
    return {
      status: 502,
      body: { error: `RunSignup answered ${response.status}.` },
    }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return {
      status: 502,
      body: { error: 'RunSignup sent something unexpected.' },
    }
  }
  return { status: 200, body: parseHalfRaces(json, today) }
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const { status, body } = await handleRaces({
    query: new URL(request.url ?? '', 'http://localhost').searchParams,
    env: process.env,
    fetchImpl: fetch,
    today: new Date().toISOString().slice(0, 10),
  })
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  if (status === 200) {
    response.setHeader(
      'cache-control',
      's-maxage=3600, stale-while-revalidate=86400',
    )
  }
  response.end(JSON.stringify(body))
}
