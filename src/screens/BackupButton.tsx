/**
 * BackupButton.tsx: "Download backup" saves all your data as a JSON file.
 *
 * download and now can be replaced in tests.
 */
import { useState } from 'react'
import { usePlanSettings } from '../plan/usePlanSettings'
import { backupFilename, buildBackup, downloadText } from '../backup/backup'
import type { IsoDate } from '../engine/types'
import { useStorage } from '../storage/useStorage'

export const BackupButton = ({
  today,
  now = () => new Date().toISOString(),
  download = downloadText,
}: {
  today: IsoDate
  now?: () => string
  download?: (filename: string, text: string) => void
}) => {
  const storage = useStorage()
  const { totalWeeks } = usePlanSettings()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const run = async () => {
    setDone(false)
    setError(undefined)
    try {
      const backup = await buildBackup(storage, now(), totalWeeks)
      download(backupFilename(today), JSON.stringify(backup, null, 2))
      setDone(true)
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : String(caught)
      setError(`Couldn't make the backup: ${reason}`)
    }
  }

  return (
    <>
      <button type="button" onClick={() => void run()}>
        Download backup
      </button>
      {error && <p role="alert">{error}</p>}
      {done && <p>Backup downloaded.</p>}
    </>
  )
}
