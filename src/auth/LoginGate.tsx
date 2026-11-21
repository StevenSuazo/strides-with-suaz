/**
 * LoginGate.tsx: shows the app only to a signed-in person.
 *
 * Signed out: an email and password form. Signed in: the app (the Sign out
 * button is on the More tab, see AccountCard). Must sit inside AuthProvider.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { isValidEmail } from './email'
import { useAuth } from './useAuth'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const LoginGate = ({ children }: { children: ReactNode }) => {
  const { auth, state } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | undefined>()

  if (state.status === 'loading') return <p>Loading…</p>

  if (state.status === 'error') {
    return <p role="alert">{`Couldn't check your sign-in: ${state.message}`}</p>
  }

  if (state.status === 'signedIn') return <>{children}</>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setError(undefined)
    setSigningIn(true)
    try {
      await auth.signIn(email.trim(), password)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <form
      className="card login"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={signingIn}>
        Sign in
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
