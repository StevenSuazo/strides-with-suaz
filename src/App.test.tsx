import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { StorageProvider } from './storage/StorageProvider'
import { seededStorage } from './test/fixtures'

const renderApp = async () =>
  render(
    <StorageProvider storage={await seededStorage()}>
      <App today="2026-11-17" />
    </StorageProvider>,
  )

describe('App', () => {
  it('renders the app title', async () => {
    await renderApp()
    expect(
      screen.getByRole('heading', { name: 'StridesWithSuaz' }),
    ).toBeInTheDocument()
    await screen.findByText('Week 2 of 19')
  })

  it('shows this week from the saved plan', async () => {
    await renderApp()
    expect(await screen.findByText('Target: 9.3 miles')).toBeInTheDocument()
  })
})
