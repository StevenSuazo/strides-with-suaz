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

  it('signs in when the link is clicked and tells listeners', async () => {
    const auth = createMemoryAuth()
    const seen: (AuthUser | null)[] = []
    auth.onChange((user) => seen.push(user))
    auth.completeSignIn('me@example.com')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.email).toBe('me@example.com')
    expect((await auth.getUser())?.email).toBe('me@example.com')
  })

  it('signs out and tells listeners', async () => {
    const auth = createMemoryAuth({ user: me })
    const seen: (AuthUser | null)[] = []
    auth.onChange((user) => seen.push(user))
    await auth.signOut()
    expect(seen).toEqual([null])
    expect(await auth.getUser()).toBeNull()
  })

  it('stops calling a listener after it unsubscribes', () => {
    const auth = createMemoryAuth()
    const seen: (AuthUser | null)[] = []
    const unsubscribe = auth.onChange((user) => seen.push(user))
    unsubscribe()
    auth.completeSignIn('me@example.com')
    expect(seen).toEqual([])
  })

  it('records the address a link was sent to', async () => {
    const auth = createMemoryAuth()
    await auth.sendMagicLink('me@example.com')
    expect(auth.sentLinks).toEqual(['me@example.com'])
  })

  it('rejects sending when given a send error, and records nothing', async () => {
    const auth = createMemoryAuth({ sendError: new Error('Rate limit') })
    await expect(auth.sendMagicLink('me@example.com')).rejects.toThrow(
      'Rate limit',
    )
    expect(auth.sentLinks).toEqual([])
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
