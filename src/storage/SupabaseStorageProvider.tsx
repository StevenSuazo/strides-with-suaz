/**
 * SupabaseStorageProvider.tsx: StorageProvider wired to the real database.
 *
 * Builds the Supabase storage once, when first shown. main.tsx puts it inside
 * LoginGate, so the client is only created once you are signed in. Too thin to
 * unit test; check it by running the app.
 */
import { useState, type ReactNode } from 'react'
import { getSupabase } from '../lib/supabase'
import { StorageProvider } from './StorageProvider'
import { createSupabaseStorage } from './supabase'

export const SupabaseStorageProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [storage] = useState(() => createSupabaseStorage(getSupabase()))
  return <StorageProvider storage={storage}>{children}</StorageProvider>
}
