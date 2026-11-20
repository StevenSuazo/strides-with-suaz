/**
 * types.ts: the one auth interface the app talks to.
 *
 * Same idea as storage: a fake (memory.ts) for tests and demo mode, and a thin
 * Supabase version (supabase.ts). The app never imports Supabase directly.
 *
 * - getUser: the signed-in user, or null. Rejects if the session cannot be read.
 * - onChange: called whenever the user signs in or out. Returns a function
 *   that stops the calls.
 * - sendMagicLink: emails a sign-in link and a 6-digit code.
 * - verifyCode: signs in with the emailed code. Rejects if it is wrong or old.
 * - signOut: forgets the session.
 */
export type AuthUser = { id: string; email: string }

export type Auth = {
  getUser: () => Promise<AuthUser | null>
  onChange: (callback: (user: AuthUser | null) => void) => () => void
  sendMagicLink: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}
