import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StorageProvider } from '../storage/StorageProvider'
import { seededStorage } from '../test/fixtures'
import { BackupButton } from './BackupButton'

const setup = async (download: (name: string, text: string) => void) => {
  render(
    <StorageProvider storage={await seededStorage()}>
      <BackupButton
        today="2026-11-18"
        now={() => '2026-11-18T05:00:00.000Z'}
        download={download}
      />
    </StorageProvider>,
  )
}

describe('BackupButton', () => {
  it('downloads a JSON backup named for today', async () => {
    const calls: [string, string][] = []
    await setup((name, text) => calls.push([name, text]))
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    await screen.findByText('Backup downloaded.')
    expect(calls.length).toBe(1)
    expect(calls[0][0]).toBe('strides-backup-2026-11-18.json')
    const parsed = JSON.parse(calls[0][1])
    expect(parsed.runs.length).toBe(3)
    expect(parsed.exportedAt).toBe('2026-11-18T05:00:00.000Z')
  })

  it('shows the reason when the backup fails', async () => {
    await setup(() => {
      throw new Error('disk full')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toBe(
      "Couldn't make the backup: disk full",
    )
    expect(screen.queryByText('Backup downloaded.')).not.toBeInTheDocument()
  })
})
