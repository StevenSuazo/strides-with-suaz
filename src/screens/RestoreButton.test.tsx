import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildBackup } from '../backup/backup'
import { StorageProvider } from '../storage/StorageProvider'
import type { AppStorage } from '../storage/types'
import { emptyStorage, seededStorage } from '../test/fixtures'
import { RestoreButton } from './RestoreButton'

const backupFile = async (text?: string) =>
  new File(
    [
      text ??
        JSON.stringify(
          await buildBackup(await seededStorage(), '2026-11-18T05:00:00Z', 19),
        ),
    ],
    'strides-backup.json',
    { type: 'application/json' },
  )

const setup = (storage: AppStorage = emptyStorage(), onRestored = vi.fn()) => {
  render(
    <StorageProvider storage={storage}>
      <RestoreButton onRestored={onRestored} />
    </StorageProvider>,
  )
  return { storage, onRestored, user: userEvent.setup() }
}

describe('RestoreButton', () => {
  it('shows what is in the file and asks before restoring', async () => {
    const { user, storage } = setup()
    await user.upload(
      screen.getByLabelText('Restore from backup'),
      await backupFile(),
    )
    expect(
      await screen.findByText(/3 runs and 1 week result/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Nothing is deleted/)).toBeInTheDocument()
    expect(await storage.getRuns()).toEqual([])
  })

  it('restores into your data and tells the page to reload', async () => {
    const { user, storage, onRestored } = setup()
    await user.upload(
      screen.getByLabelText('Restore from backup'),
      await backupFile(),
    )
    await user.click(await screen.findByRole('button', { name: 'Restore' }))
    expect(await screen.findByText(/Restored 3 runs/)).toBeInTheDocument()
    expect((await storage.getRuns()).length).toBe(3)
    expect(onRestored).toHaveBeenCalledTimes(1)
  })

  it('does nothing when you cancel', async () => {
    const { user, storage, onRestored } = setup()
    await user.upload(
      screen.getByLabelText('Restore from backup'),
      await backupFile(),
    )
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
    expect(await storage.getRuns()).toEqual([])
    expect(onRestored).not.toHaveBeenCalled()
  })

  it('shows why a bad file was refused and saves nothing', async () => {
    const { user, storage } = setup()
    await user.upload(
      screen.getByLabelText('Restore from backup'),
      await backupFile('nope'),
    )
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't read that backup: That file isn't valid JSON.",
    )
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
    expect(await storage.getRuns()).toEqual([])
  })

  it('shows the reason when saving fails', async () => {
    const storage = emptyStorage()
    storage.saveRun = async () => {
      throw new Error('offline')
    }
    const { user, onRestored } = setup(storage)
    await user.upload(
      screen.getByLabelText('Restore from backup'),
      await backupFile(),
    )
    await user.click(await screen.findByRole('button', { name: 'Restore' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't restore: offline",
    )
    expect(onRestored).not.toHaveBeenCalled()
  })

  it('lets you pick the same file again after a refusal', async () => {
    const { user } = setup()
    const input = screen.getByLabelText(
      'Restore from backup',
    ) as HTMLInputElement
    await user.upload(input, await backupFile('nope'))
    await screen.findByRole('alert')
    await waitFor(() => expect(input.value).toBe(''))
    fireEvent.change(input, { target: { files: [await backupFile()] } })
    expect(await screen.findByText(/3 runs/)).toBeInTheDocument()
  })
})
