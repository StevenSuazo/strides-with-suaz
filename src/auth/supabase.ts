/**
 * supabase.ts: the real Auth, a thin wrapper over supabase-js.
 *
 * Kept too small to unit test; check it by signing in for real. The account
 * is created by hand in the Supabase dashboard (sign-ups are off). The session
 * is saved in the browser by supabase-js.
 */
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import type { Auth, AuthUser } from './types'

const toUser = (user: User | null | undefined): AuthUser | null =>
  user ? { id: user.id, email: user.email ?? '' } : null

export const createSupabaseAuth: () => Auth = () => ({
  getUser: async () => {
    const { data, error } = await getSupabase().auth.getSession()
    if (error) throw error
    return toUser(data.session?.user)
  },
  onChange: (callback) => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) =>
      callback(toUser(session?.user)),
    )
    return () => data.subscription.unsubscribe()
  },
  signIn: async (email, password) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },
  signOut: async () => {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw error
  },
})
