import { describe, expect, it } from 'vitest'
import type { AuthUser } from './types'
import { createMemoryAuth } from './memory'

const me: AuthUser = { id: 'u1', email: 'me@example.com' }

describe('createMemoryAuth', () => {
  it('starts signed out', async () => {
    expect(await createMemoryAuth().getUser()).toBeNull()
  })

  it('starts signed in when given a user', async () => {
    expect(await createMemoryAuth({ user: me }).getUser()).toEqual(me)
  })

  it('signs in with the right password and tells listeners', async () => {
    const auth = createMemoryAuth()
    const seen: (AuthUser | null)[] = []
    auth.onChange((user) => seen.push(user))
    await auth.signIn('me@example.com', 'password123')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.email).toBe('me@example.com')
    expect((await auth.getUser())?.email).toBe('me@example.com')
  })

  it('accepts a custom password', async () => {
    const auth = createMemoryAuth({ password: 'hunter2' })
    await auth.signIn('me@example.com', 'hunter2')
    expect((await auth.getUser())?.email).toBe('me@example.com')
  })

  it('rejects a wrong password and stays signed out', async () => {
    const auth = createMemoryAuth()
    const seen: (AuthUser | null)[] = []
    auth.onChange((user) => seen.push(user))
    await expect(auth.signIn('me@example.com', 'nope')).rejects.toThrow(
      'Invalid login credentials',
    )
    expect(seen).toEqual([])
    expect(await auth.getUser()).toBeNull()
  })

  it('rejects sign-in when given a sign-in error', async () => {
    const auth = createMemoryAuth({ signInError: new Error('Rate limit') })
    await expect(auth.signIn('me@example.com', 'password123')).rejects.toThrow(
      'Rate limit',
    )
    expect(await auth.getUser()).toBeNull()
  })

  it('signs out and tells listeners', async () => {
    const auth = createMemoryAuth({ user: me })
    const seen: (AuthUser | null)[] = []
    auth.onChange((user) => seen.push(user))
    await auth.signOut()
    expect(seen).toEqual([null])
    expect(await auth.getUser()).toBeNull()
  })

  it('stops calling a listener after it unsubscribes', async () => {
    const auth = createMemoryAuth()
    const seen: (AuthUser | null)[] = []
    const unsubscribe = auth.onChange((user) => seen.push(user))
    unsubscribe()
    await auth.signIn('me@example.com', 'password123')
    expect(seen).toEqual([])
  })

  it('rejects getUser when given a read error', async () => {
    const auth = createMemoryAuth({ getUserError: new Error('No env') })
    await expect(auth.getUser()).rejects.toThrow('No env')
  })

  it('hands out copies of the user', async () => {
    const auth = createMemoryAuth({ user: me })
    const read = await auth.getUser()
    read!.email = 'changed@example.com'
    expect((await auth.getUser())?.email).toBe('me@example.com')
  })
})
