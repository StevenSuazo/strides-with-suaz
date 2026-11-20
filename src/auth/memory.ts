/**
 * memory.ts: a fake Auth for tests and demo mode. It never sends email.
 *
 * createMemoryAuth(options?): MemoryAuth
 * - options.user: start signed in.
 * - options.sendError / getUserError / verifyError: make that call reject.
 * - options.code: the code verifyCode accepts (default 123456).
 * - sentLinks: the addresses sendMagicLink was called with.
 * - listenerCount(): how many onChange listeners are still subscribed.
 * - completeSignIn(email): pretends the person clicked the emailed link.
 */
import type { Auth, AuthUser } from './types'

export type MemoryAuth = Auth & {
  sentLinks: string[]
  listenerCount: () => number
  completeSignIn: (email: string) => void
}

type Options = {
  user?: AuthUser
  sendError?: Error
  getUserError?: Error
  verifyError?: Error
  code?: string
}

export const createMemoryAuth: (options?: Options) => MemoryAuth = (
  options = {},
) => {
  let user: AuthUser | null = options.user ? { ...options.user } : null
  const listeners = new Set<(user: AuthUser | null) => void>()
  const sentLinks: string[] = []

  const current = (): AuthUser | null => (user ? { ...user } : null)
  const notify = (): void =>
    listeners.forEach((listener) => listener(current()))

  return {
    sentLinks,
    listenerCount: () => listeners.size,
    getUser: async () => {
      if (options.getUserError) throw options.getUserError
      return current()
    },
    onChange: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    sendMagicLink: async (email) => {
      if (options.sendError) throw options.sendError
      sentLinks.push(email)
    },
    verifyCode: async (email, code) => {
      if (options.verifyError) throw options.verifyError
      if (code !== (options.code ?? '123456')) throw new Error('Invalid code')
      user = { id: `user-${email}`, email }
      notify()
    },
    signOut: async () => {
      user = null
      notify()
    },
    completeSignIn: (email) => {
      user = { id: `user-${email}`, email }
      notify()
    },
  }
}
