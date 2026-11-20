/**
 * memory.ts: a fake Auth for tests and demo mode. It never contacts a server.
 *
 * createMemoryAuth(options?): MemoryAuth
 * - options.user: start signed in.
 * - options.password: the password signIn accepts (default "password123").
 * - options.signInError / getUserError: make that call reject.
 * - listenerCount(): how many onChange listeners are still subscribed.
 */
import type { Auth, AuthUser } from './types'

export type MemoryAuth = Auth & {
  listenerCount: () => number
}

type Options = {
  user?: AuthUser
  password?: string
  signInError?: Error
  getUserError?: Error
}

export const createMemoryAuth: (options?: Options) => MemoryAuth = (
  options = {},
) => {
  let user: AuthUser | null = options.user ? { ...options.user } : null
  const listeners = new Set<(user: AuthUser | null) => void>()

  const current = (): AuthUser | null => (user ? { ...user } : null)
  const notify = (): void =>
    listeners.forEach((listener) => listener(current()))

  return {
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
    signIn: async (email, password) => {
      if (options.signInError) throw options.signInError
      if (password !== (options.password ?? 'password123')) {
        throw new Error('Invalid login credentials')
      }
      user = { id: `user-${email}`, email }
      notify()
    },
    signOut: async () => {
      user = null
      notify()
    },
  }
}
