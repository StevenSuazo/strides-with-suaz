// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { handleRaces, parseHalfRaces } from './races.ts'

// Trimmed from a real RunSignup answer (name=United Half, state=NY): the
// official race, and a charity team page that lists a 26.2-mile event.
const OFFICIAL = {
  race: {
    race_id: 194265,
    name: '2027 United Airlines NYC Half Marathon',
    next_date: '03/21/2027',
    url: 'https://runsignup.com/Race/NY/Brooklyn/UnitedAirlinesNYCHalfMarathon',
    address: { city: 'Brooklyn', state: 'NY' },
    events: [
      {
        name: 'Half Marathon',
        start_time: '3/21/2027 07:00',
        distance: '13.1 Miles',
      },
    ],
  },
}
const CHARITY = {
  race: {
    race_id: 220804,
    name: "United AirlinesNYC Half Semper Fi & America's Fund Team",
    next_date: '03/21/2027',
    url: 'https://runsignup.com/Race/NY/NewYork/Team',
    address: { city: 'New York', state: 'NY' },
    events: [
      {
        name: 'Participant',
        start_time: '3/21/2027 06:00',
        distance: '26.2 Miles',
      },
      {
        name: 'Fundraiser Only',
        start_time: '3/21/2027 06:00',
        distance: '26.2 Miles',
      },
    ],
  },
}
const TODAY = '2026-11-24'

const race = (
  id: number,
  name: string,
  events: { name?: string; start_time?: string; distance?: string }[],
  next_date: string | null = '04/18/2027',
) => ({
  race: {
    race_id: id,
    name,
    next_date,
    url: `https://runsignup.com/Race/${id}`,
    address: { city: 'Town', state: 'NJ' },
    events,
  },
})

describe('parseHalfRaces', () => {
  it('keeps the official half and turns it into a simple race', () => {
    expect(parseHalfRaces({ races: [OFFICIAL] }, TODAY)).toEqual([
      {
        id: '194265',
        name: '2027 United Airlines NYC Half Marathon',
        city: 'Brooklyn',
        state: 'NY',
        date: '2027-03-21',
        url: 'https://runsignup.com/Race/NY/Brooklyn/UnitedAirlinesNYCHalfMarathon',
      },
    ])
  })

  it('drops a race with no half-marathon event, whatever its name says', () => {
    expect(parseHalfRaces({ races: [CHARITY] }, TODAY)).toEqual([])
  })

  it('finds the half among other events, and takes its date', () => {
    const mixed = race(1, 'Spring Races', [
      { name: '5K', start_time: '4/17/2027 08:00', distance: '3.1 Miles' },
      { name: 'Half', start_time: '4/18/2027 07:30', distance: '13.1 Miles' },
    ])
    const [found] = parseHalfRaces({ races: [mixed] }, TODAY)
    expect(found.date).toBe('2027-04-18')
  })

  it('uses the half event’s date, not the race’s first day', () => {
    const weekend = race(
      2,
      'Weekend Festival',
      [{ start_time: '4/18/2027 07:00', distance: '13.1 Miles' }],
      '04/17/2027',
    )
    expect(parseHalfRaces({ races: [weekend] }, TODAY)[0].date).toBe(
      '2027-04-18',
    )
  })

  it('falls back to the race date when the event has no start time', () => {
    const noTime = race(
      3,
      'No Time',
      [{ distance: '13.1 Miles' }],
      '05/02/2027',
    )
    expect(parseHalfRaces({ races: [noTime] }, TODAY)[0].date).toBe(
      '2027-05-02',
    )
  })

  it('accepts a half measured in kilometers', () => {
    const km = race(4, 'Metric Half', [
      { start_time: '6/6/2027 08:00', distance: '21.1 K' },
    ])
    expect(parseHalfRaces({ races: [km] }, TODAY)).toHaveLength(1)
  })

  it('does not take a 10-mile or a marathon for a half', () => {
    const others = [
      race(5, 'Ten Miler', [
        { start_time: '4/1/2027 08:00', distance: '10 Miles' },
      ]),
      race(6, 'Marathon', [
        { start_time: '4/1/2027 08:00', distance: '26.2 Miles' },
      ]),
      race(7, '15K', [{ start_time: '4/1/2027 08:00', distance: '15 K' }]),
    ]
    expect(parseHalfRaces({ races: others }, TODAY)).toEqual([])
  })

  it('leaves out races that have already happened', () => {
    const past = race(8, 'Old Half', [
      { start_time: '11/01/2026 08:00', distance: '13.1 Miles' },
    ])
    const today = race(9, 'Today Half', [
      { start_time: '11/24/2026 08:00', distance: '13.1 Miles' },
    ])
    expect(
      parseHalfRaces({ races: [past, today] }, TODAY).map((r) => r.name),
    ).toEqual(['Today Half'])
  })

  it('lists each race once, soonest first, then by name', () => {
    const list = [
      race(10, 'Zed Half', [
        { start_time: '5/1/2027 08:00', distance: '13.1 Miles' },
      ]),
      race(11, 'Alpha Half', [
        { start_time: '5/1/2027 08:00', distance: '13.1 Miles' },
      ]),
      race(12, 'Early Half', [
        { start_time: '3/1/2027 08:00', distance: '13.1 Miles' },
      ]),
      race(10, 'Zed Half', [
        { start_time: '5/1/2027 08:00', distance: '13.1 Miles' },
      ]),
    ]
    expect(parseHalfRaces({ races: list }, TODAY).map((r) => r.name)).toEqual([
      'Early Half',
      'Alpha Half',
      'Zed Half',
    ])
  })

  it('copes with missing or odd data instead of throwing', () => {
    expect(parseHalfRaces(undefined, TODAY)).toEqual([])
    expect(parseHalfRaces({}, TODAY)).toEqual([])
    expect(parseHalfRaces({ races: 'nope' }, TODAY)).toEqual([])
    expect(
      parseHalfRaces({ races: [null, 5, {}, { race: {} }] }, TODAY),
    ).toEqual([])
    const noAddress = {
      race: {
        race_id: 13,
        name: 'No Address',
        url: 'https://example.com',
        events: [{ start_time: '4/4/2027 08:00', distance: '13.1 Miles' }],
      },
    }
    expect(parseHalfRaces({ races: [noAddress] }, TODAY)[0]).toMatchObject({
      city: '',
      state: '',
    })
  })
})

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const run = async (
  query: string,
  options: {
    env?: Record<string, string>
    reply?: () => Response | Promise<Response>
  } = {},
) => {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const result = await handleRaces({
    query: new URLSearchParams(query),
    env: options.env ?? {},
    today: TODAY,
    fetchImpl: async (input, init) => {
      calls.push({
        url: String(input),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
      })
      return options.reply ? options.reply() : answer({ races: [OFFICIAL] })
    },
  })
  return { ...result, calls }
}

describe('handleRaces', () => {
  it('needs at least 3 letters of a name', async () => {
    const { status, body, calls } = await run('name=ny')
    expect(status).toBe(400)
    expect(body).toEqual({ error: 'Type at least 3 letters of the race name.' })
    expect(calls).toHaveLength(0)
  })

  it('asks RunSignup for upcoming races by name, with their events', async () => {
    const { calls } = await run('name=United+Half')
    const url = new URL(calls[0].url)
    expect(url.origin + url.pathname).toBe(
      'https://api.runsignup.com/rest/races',
    )
    expect(url.searchParams.get('format')).toBe('json')
    expect(url.searchParams.get('events')).toBe('T')
    expect(url.searchParams.get('name')).toBe('United Half')
    expect(url.searchParams.get('start_date')).toBe(TODAY)
    expect(url.searchParams.has('state')).toBe(false)
  })

  it('passes a two-letter state along, and ignores anything else', async () => {
    const withState = await run('name=United&state=ny')
    expect(new URL(withState.calls[0].url).searchParams.get('state')).toBe('NY')
    const bad = await run('name=United&state=New+York')
    expect(new URL(bad.calls[0].url).searchParams.has('state')).toBe(false)
  })

  it('sends no credentials when none are configured', async () => {
    const { calls } = await run('name=United')
    const url = new URL(calls[0].url)
    expect(url.searchParams.has('api_key')).toBe(false)
    expect(url.searchParams.has('rsu_api_reg')).toBe(false)
    expect(calls[0].headers['x-rsu-api-reg-secret']).toBeUndefined()
  })

  it('adds the configured key, secret and API caller registration', async () => {
    const { calls } = await run('name=United', {
      env: {
        RUNSIGNUP_API_KEY: 'k',
        RUNSIGNUP_API_SECRET: 's',
        RUNSIGNUP_REG_TOKEN: 'tok',
        RUNSIGNUP_REG_SECRET: 'sec',
      },
    })
    const url = new URL(calls[0].url)
    expect(url.searchParams.get('api_key')).toBe('k')
    expect(url.searchParams.get('api_secret')).toBe('s')
    expect(url.searchParams.get('rsu_api_reg')).toBe('tok')
    expect(calls[0].headers['x-rsu-api-reg-secret']).toBe('sec')
  })

  it('returns the halves it found', async () => {
    const { status, body } = await run('name=United', {
      reply: () => answer({ races: [OFFICIAL, CHARITY] }),
    })
    expect(status).toBe(200)
    expect(body).toHaveLength(1)
    expect((body as { name: string }[])[0].name).toBe(
      '2027 United Airlines NYC Half Marathon',
    )
  })

  it('says so when RunSignup refuses', async () => {
    const { status, body } = await run('name=United', {
      reply: () => answer({ error: 'nope' }, 401),
    })
    expect(status).toBe(502)
    expect(body).toEqual({ error: 'RunSignup answered 401.' })
  })

  it('says so when RunSignup cannot be reached or sends junk', async () => {
    const down = await run('name=United', {
      reply: () => {
        throw new Error('network down')
      },
    })
    expect(down.status).toBe(502)
    expect(down.body).toEqual({ error: 'Could not reach RunSignup.' })

    const junk = await run('name=United', {
      reply: () => new Response('<html>oops</html>', { status: 200 }),
    })
    expect(junk.status).toBe(502)
    expect(junk.body).toEqual({ error: 'RunSignup sent something unexpected.' })
  })
})
