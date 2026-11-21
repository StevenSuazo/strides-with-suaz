import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeatherIcon } from './WeatherIcon'

describe('WeatherIcon', () => {
  it.each([
    ['clear', 'Sunny'],
    ['partly', 'Partly cloudy'],
    ['cloudy', 'Cloudy'],
    ['fog', 'Foggy'],
    ['rain', 'Rain'],
    ['snow', 'Snow'],
    ['storm', 'Thunderstorms'],
  ] as const)('shows a labelled picture for %s', (condition, label) => {
    render(<WeatherIcon condition={condition} />)
    expect(screen.getByRole('img', { name: label })).toBeInTheDocument()
  })
})
