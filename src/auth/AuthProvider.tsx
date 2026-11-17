/**
 * AuthProvider.tsx: tracks who is signed in and shares it with the app.
 *
 * On mount it reads the saved session and listens for sign-in and sign-out.
 * If a sign-in event arrives before the first read finishes, the event wins.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthState } from './AuthContext'
import type { Auth, AuthUser } from './types'

const stateFor = (user: AuthUser | null): AuthState =>
  user ? { status: 'signedIn', user } : { status: 'signedOut' }

export const AuthProvider = ({
  auth,
  children,
}: {
  auth: Auth
  children: ReactNode
}) => {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    let heardChange = false

    const unsubscribe = auth.onChange((user) => {
      if (!active) return
      heardChange = true
      setState(stateFor(user))
    })

    auth
      .getUser()
      .then((user) => {
        if (active && !heardChange) setState(stateFor(user))
      })
      .catch((error: unknown) => {
        if (active && !heardChange) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [auth])

  const value = useMemo(() => ({ auth, state }), [auth, state])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
