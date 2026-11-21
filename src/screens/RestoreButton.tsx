/**
 * RestoreButton.tsx: "Restore from backup" loads a backup file you saved.
 *
 * Pick a file and it shows what is inside and asks first. Restore merges: the
 * file's records are saved over matching ones and added if new, and nothing
 * you have now is deleted. A bad file is refused with the reason and nothing
 * is saved. onRestored is called after a successful restore so the page can
 * reload. readFile can be replaced in tests.
 */
import { useState, type ChangeEvent } from 'react'
import type { Backup } from '../backup/backup'
import { parseBackup, restoreBackup, summarizeBackup } from '../backup/restore'
import { useStorage } from '../storage/useStorage'

const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read'))
    reader.readAsText(file)
  })

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const RestoreButton = ({
  onRestored,
  readFile = readText,
}: {
  onRestored: () => void
  readFile?: (file: File) => Promise<string>
}) => {
  const storage = useStorage()
  const [pending, setPending] = useState<Backup | undefined>()
  const [done, setDone] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    setPending(undefined)
    setDone(undefined)
    setError(undefined)
    if (!file) return
    try {
      setPending(parseBackup(await readFile(file)))
    } catch (caught) {
      setError(`Couldn't read that backup: ${messageOf(caught)}`)
    } finally {
      input.value = ''
    }
  }

  const restore = async () => {
    if (!pending) return
    setBusy(true)
    setError(undefined)
    try {
      await restoreBackup(storage, pending)
      setDone(`Restored ${summarizeBackup(pending)}.`)
      setPending(undefined)
      onRestored()
    } catch (caught) {
      setError(`Couldn't restore: ${messageOf(caught)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <label>
        Restore from backup{' '}
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => void choose(event)}
        />
      </label>
      {pending && (
        <>
          <p>
            {`This backup has ${summarizeBackup(pending)}. Restoring adds these to your data and replaces anything with the same id. Nothing is deleted.`}
          </p>
          <button type="button" disabled={busy} onClick={() => void restore()}>
            Restore
          </button>{' '}
          <button
            type="button"
            disabled={busy}
            onClick={() => setPending(undefined)}
          >
            Cancel
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {done && <p>{done}</p>}
    </>
  )
}
