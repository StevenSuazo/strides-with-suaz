import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WeatherState } from '../weather/useWeather'
import { WeatherExtras, WeatherSide } from './WeatherSection'

const place = { lat: 1, lon: 2, label: 'Brooklyn, New York' }
const forecast = {
  condition: 'clear' as const,
  highF: 91,
  lowF: 70,
  feelsLikeHighF: 95,
  rainChance: 10,
}
const ready: WeatherState = { status: 'ready', place, forecast }

const actions = () => ({
  locateMe: vi.fn(),
  lookUp: vi.fn(),
  clear: vi.fn(),
  retry: vi.fn(),
})

const show = (state: WeatherState, notice?: string, a = actions()) => {
  render(
    <>
      <WeatherSide state={state} clear={a.clear} retry={a.retry} />
      <WeatherExtras
        state={state}
        notice={notice}
        locateMe={a.locateMe}
        lookUp={a.lookUp}
      />
    </>,
  )
  return a
}

describe('Weather in the header', () => {
  it('offers your location or a typed place when none is saved', async () => {
    const a = show({ status: 'needsLocation' })
    await userEvent.click(
      screen.getByRole('button', { name: 'Use my location' }),
    )
    expect(a.locateMe).toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('City or ZIP code'), '10001')
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(a.lookUp).toHaveBeenCalledWith('10001')
  })

  it('does not look up an empty box', async () => {
    const a = show({ status: 'needsLocation' })
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(a.lookUp).not.toHaveBeenCalled()
  })

  it('shows a location problem', () => {
    show({ status: 'needsLocation' }, 'Location is turned off for this site.')
    expect(
      screen.getByText('Location is turned off for this site.'),
    ).toBeInTheDocument()
  })

  it('shows the details, notes and place, and can change the place', async () => {
    const a = show(ready)
    expect(screen.getByRole('img', { name: 'Sunny' })).toBeInTheDocument()
    expect(screen.getByText('91°')).toBeInTheDocument()
    expect(screen.getByText('Low 70°')).toBeInTheDocument()
    expect(screen.getByText('Feels like 95°')).toBeInTheDocument()
    expect(screen.getByText('10% chance of rain')).toBeInTheDocument()
    expect(screen.getByText(/Very hot/)).toBeInTheDocument()
    expect(screen.getByText('Brooklyn, New York')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Change location' }),
    )
    expect(a.clear).toHaveBeenCalled()
  })

  it('says it is loading', () => {
    show({ status: 'loading' })
    expect(screen.getByText('Loading the weather…')).toBeInTheDocument()
  })

  it('says the forecast is not available yet', () => {
    show({ status: 'unavailable', place })
    expect(screen.getByText('Forecast not available yet')).toBeInTheDocument()
    expect(screen.getByText('Brooklyn, New York')).toBeInTheDocument()
  })

  it('shows an error and can retry', async () => {
    const a = show({ status: 'error', place, message: 'offline' })
    expect(
      screen.getByText("Couldn't load the weather: offline"),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(a.retry).toHaveBeenCalled()
  })
})
