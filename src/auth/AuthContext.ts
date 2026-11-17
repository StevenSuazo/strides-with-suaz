/**
 * AuthContext.ts: what the provider shares with the rest of the app.
 *
 * status is 'loading' until the saved session has been read, then
 * 'signedOut', 'signedIn' (with the user) or 'error' (with a message).
 */
import { createContext } from 'react'
import type { Auth, AuthUser } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser }
  | { status: 'error'; message: string }

export type AuthContextValue = { auth: Auth; state: AuthState }

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
