/**
 * AccountCard.tsx: "Signed in as ..." with a Sign out button.
 *
 * Lives on the More tab. Shows nothing unless someone is signed in. Must sit
 * inside AuthProvider.
 */
import { useAuth } from './useAuth'

export const AccountCard = () => {
  const { auth, state } = useAuth()
  if (state.status !== 'signedIn') return null
  return (
    <section className="card">
      <h2>Account</h2>
      <p>{`Signed in as ${state.user.email}`}</p>
      <button type="button" onClick={() => void auth.signOut()}>
        Sign out
      </button>
    </section>
  )
}
