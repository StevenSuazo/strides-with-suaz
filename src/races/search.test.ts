import { describe, expect, it } from 'vitest'
import { searchRaces, type RaceChoice } from './search'

const nyc: RaceChoice = {
  id: '194265',
  name: '2027 United Airlines NYC Half Marathon',
  city: 'Brooklyn',
  state: 'NY',
  date: '2027-03-21',
  url: 'https://runsignup.com/Race/NY/Brooklyn/UnitedAirlinesNYCHalfMarathon',
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

describe('searchRaces', () => {
  it('asks our own /api/races with the words typed, and returns the races', async () => {
    const urls: string[] = []
    const found = await searchRaces('United Half', async (input) => {
      urls.push(String(input))
      return reply([nyc])
    })
    expect(urls).toEqual(['/api/races?name=United%20Half'])
    expect(found).toEqual([nyc])
  })

  it('trims what was typed', async () => {
    const urls: string[] = []
    await searchRaces('  NYC  ', async (input) => {
      urls.push(String(input))
      return reply([])
    })
    expect(urls[0]).toBe('/api/races?name=NYC')
  })

  it('returns an empty list when nothing matched', async () => {
    expect(await searchRaces('zzzz', async () => reply([]))).toEqual([])
  })

  it('throws the server’s own message when it sends one', async () => {
    await expect(
      searchRaces('ny', async () =>
        reply({ error: 'Type at least 3 letters of the race name.' }, 400),
      ),
    ).rejects.toThrow('Type at least 3 letters of the race name.')
  })

  it('throws a plain message when the failure has no body', async () => {
    await expect(
      searchRaces('United', async () => new Response('', { status: 500 })),
    ).rejects.toThrow('Race search failed (500).')
  })

  it('throws when the network is down', async () => {
    await expect(
      searchRaces('United', async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).rejects.toThrow('Could not reach the race search.')
  })

  it('throws when the answer is not a list of races', async () => {
    await expect(
      searchRaces('United', async () => reply({ races: [] })),
    ).rejects.toThrow('Race search sent something unexpected.')
    await expect(
      searchRaces('United', async () => reply([{ id: 1 }])),
    ).rejects.toThrow('Race search sent something unexpected.')
  })
})
