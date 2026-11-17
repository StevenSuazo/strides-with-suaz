/**
 * LoginGate.tsx: shows the app only to a signed-in person.
 *
 * Signed out: an email form that sends a magic link. Signed in: a bar with
 * the email and a Sign out button, then the app. Must sit inside AuthProvider.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { isValidEmail } from './email'
import { useAuth } from './useAuth'

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const LoginGate = ({ children }: { children: ReactNode }) => {
  const { auth, state } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | undefined>()

  if (state.status === 'loading') return <p>Loading…</p>

  if (state.status === 'error') {
    return <p role="alert">{`Couldn't check your sign-in: ${state.message}`}</p>
  }

  if (state.status === 'signedIn') {
    return (
      <>
        <div>
          <span>{state.user.email}</span>
          <button type="button" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
        {children}
      </>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSent(false)
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError(undefined)
    setSending(true)
    try {
      await auth.sendMagicLink(email.trim())
      setSent(true)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" disabled={sending}>
        Send magic link
      </button>
      {error && <p role="alert">{error}</p>}
      {sent && <p>Check your email for a sign-in link.</p>}
    </form>
  )
}
