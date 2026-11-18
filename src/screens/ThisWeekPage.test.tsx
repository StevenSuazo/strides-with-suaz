import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { seededStorage } from '../test/fixtures'
import { ThisWeekPage } from './ThisWeekPage'

const show = (storage: AppStorage) =>
  render(
    <StorageProvider storage={storage}>
      <ThisWeekPage today="2026-11-17" />
    </StorageProvider>,
  )

describe('ThisWeekPage', () => {
  it('shows a loading message, then the week', async () => {
    show(await seededStorage())
    expect(screen.getByText('Loading your plan…')).toBeInTheDocument()
    expect(await screen.findByText('Week 2 of 19')).toBeInTheDocument()
    expect(screen.queryByText('Loading your plan…')).not.toBeInTheDocument()
  })

  it('shows why when the plan cannot be loaded', async () => {
    const storage = await seededStorage()
    storage.getRuns = async () => {
      throw new Error('offline')
    }
    show(storage)
    expect(
      await screen.findByText("Couldn't load your plan: offline"),
    ).toBeInTheDocument()
  })
})
