/**
 * StorageProvider.tsx: hands one AppStorage to the whole component tree.
 *
 * The app gives it Supabase storage, tests give it the in-memory version, so
 * screens never know which one they are talking to.
 */
import type { ReactNode } from 'react'
import { StorageContext } from './StorageContext'
import type { AppStorage } from './types'

export const StorageProvider = ({
  storage,
  children,
}: {
  storage: AppStorage
  children: ReactNode
}) => (
  <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
)
