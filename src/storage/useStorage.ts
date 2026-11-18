/** useStorage.ts: the app's storage, from the nearest StorageProvider. */
import { useContext } from 'react'
import { StorageContext } from './StorageContext'
import type { AppStorage } from './types'

export const useStorage = (): AppStorage => {
  const storage = useContext(StorageContext)
  if (!storage) {
    throw new Error('useStorage must be used inside a StorageProvider')
  }
  return storage
}
