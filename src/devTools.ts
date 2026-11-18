/**
 * devTools.ts: browser-console helper, loaded only by `npm run dev`.
 *
 * installDevTools() adds window.strides.storage, a Supabase-backed AppStorage,
 * so you can try saves and reads in the console while signed in. The client is
 * built on first use. main.tsx imports this file only inside an
 * import.meta.env.DEV check, so it never reaches the production build.
 */
import { getSupabase } from './lib/supabase'
import { createSupabaseStorage } from './storage/supabase'
import type { AppStorage } from './storage/types'

declare global {
  interface Window {
    strides?: { storage: AppStorage }
  }
}

export const installDevTools = (): void => {
  let storage: AppStorage | undefined
  window.strides = {
    get storage() {
      storage ??= createSupabaseStorage(getSupabase())
      return storage
    },
  }
}
