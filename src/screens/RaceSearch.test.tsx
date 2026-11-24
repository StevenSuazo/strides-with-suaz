import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { RaceChoice } from '../races/search'
import { RaceSearch } from './RaceSearch'

const nyc: RaceChoice = {
  id: '1',
  name: '2027 United Airlines NYC Half Marathon',
  city: 'Brooklyn',
  state: 'NY',
  date: '2027-03-21',
  url: 'https://runsignup.com/Race/1',
}
const brooklyn: RaceChoice = {
  id: '2',
  name: 'Brooklyn Half',
  city: 'Brooklyn',
  state: 'NY',
  date: '2027-05-15',
  url: 'https://runsignup.com/Race/2',
}

const setup = (search: (words: string) => Promise<RaceChoice[]>) => {
  const picked: RaceChoice[] = []
  render(<RaceSearch onPick={(race) => picked.push(race)} search={search} />)
  return { picked, user: userEvent.setup() }
}

const box = () => screen.getByLabelText('Find a half marathon')
const searchButton = () => screen.getByRole('button', { name: 'Search' })

describe('RaceSearch', () => {
  it('keeps Search off until 3 letters are typed', async () => {
    const { user } = setup(async () => [])
    expect(searchButton()).toBeDisabled()
    await user.type(box(), 'ny')
    expect(searchButton()).toBeDisabled()
    await user.type(box(), 'c')
    expect(searchButton()).toBeEnabled()
  })

  it('searches for the words typed, and lists what it finds', async () => {
    const asked: string[] = []
    const { user } = setup(async (words) => {
      asked.push(words)
      return [nyc, brooklyn]
    })
    await user.type(box(), 'nyc half')
    await user.click(searchButton())
    expect(asked).toEqual(['nyc half'])
    const first = await screen.findByRole('button', {
      name: /2027 United Airlines NYC Half Marathon/,
    })
    expect(first).toHaveTextContent('Brooklyn, NY')
    expect(first).toHaveTextContent('Sun, Mar 21, 2027')
    expect(
      screen.getByRole('button', { name: /Brooklyn Half/ }),
    ).toHaveTextContent('Sat, May 15, 2027')
  })

  it('searches when Enter is pressed too', async () => {
    const asked: string[] = []
    const { user } = setup(async (words) => {
      asked.push(words)
      return []
    })
    await user.type(box(), 'nyc{Enter}')
    expect(asked).toEqual(['nyc'])
  })

  it('shows a message while it is searching', async () => {
    let finish: (races: RaceChoice[]) => void = () => {}
    const { user } = setup(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await user.type(box(), 'nyc')
    await user.click(searchButton())
    expect(screen.getByText('Searching…')).toBeInTheDocument()
    finish([nyc])
    await screen.findByRole('button', { name: /NYC Half/ })
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
  })

  it('says so when nothing matches, and points to entering a date', async () => {
    const { user } = setup(async () => [])
    await user.type(box(), 'zzzz')
    await user.click(searchButton())
    expect(
      await screen.findByText(
        'No half marathons found. You can enter your own race date below.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the reason when the search fails', async () => {
    const { user } = setup(async () => {
      throw new Error('Could not reach the race search.')
    })
    await user.type(box(), 'nyc')
    await user.click(searchButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the race search.',
    )
  })

  it('hands over the race that was picked and closes the list', async () => {
    const { picked, user } = setup(async () => [nyc, brooklyn])
    await user.type(box(), 'half')
    await user.click(searchButton())
    await user.click(
      await screen.findByRole('button', { name: /Brooklyn Half/ }),
    )
    expect(picked).toEqual([brooklyn])
    expect(
      screen.queryByRole('button', { name: /Brooklyn Half/ }),
    ).not.toBeInTheDocument()
  })

  it('shows only the newest search when two overlap', async () => {
    const resolvers: ((races: RaceChoice[]) => void)[] = []
    const { user } = setup(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }),
    )
    await user.type(box(), 'nyc')
    await user.click(searchButton())
    await user.clear(box())
    await user.type(box(), 'brooklyn')
    await user.click(searchButton())
    resolvers[1]([brooklyn])
    await screen.findByRole('button', { name: /Brooklyn Half/ })
    resolvers[0]([nyc]) // the old answer arrives late
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(
      screen.queryByRole('button', { name: /NYC Half/ }),
    ).not.toBeInTheDocument()
  })
})
