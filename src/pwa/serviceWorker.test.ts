import { beforeEach, describe, expect, it, vi } from 'vitest'
import source from '../../public/sw.js?raw'

type Listener = (event: Record<string, unknown>) => void

const makeWorker = (network: (req: unknown) => Promise<unknown>) => {
  const listeners: Record<string, Listener> = {}
  const stores = new Map<string, Map<string, unknown>>()
  const keyOf = (r: unknown) =>
    typeof r === 'string' ? r : (r as { url: string }).url
  const open = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return Promise.resolve({
      addAll: async (urls: string[]) => {
        for (const u of urls)
          store.set(new URL(u, 'https://x.test').href, { body: `shell ${u}` })
      },
      put: async (r: unknown, res: unknown) =>
        void store.set(new URL(keyOf(r), 'https://x.test').href, res),
    })
  }
  const caches = {
    open,
    keys: async () => [...stores.keys()],
    delete: async (n: string) => stores.delete(n),
    match: async (r: unknown) => {
      const key = new URL(keyOf(r), 'https://x.test').href
      for (const s of stores.values()) if (s.has(key)) return s.get(key)
      return undefined
    },
  }
  const self = {
    location: { origin: 'https://x.test' },
    addEventListener: (type: string, fn: Listener) =>
      void (listeners[type] = fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  new Function('self', 'caches', 'fetch', source)(self, caches, network)
  const run = async (type: string, event: Record<string, unknown> = {}) => {
    let pending: Promise<unknown> | undefined
    let responded: Promise<unknown> | undefined
    await Promise.resolve(
      listeners[type]({
        ...event,
        waitUntil: (p: Promise<unknown>) => void (pending = p),
        respondWith: (p: Promise<unknown>) => void (responded = p),
      }),
    )
    await pending
    return responded ? await responded : undefined
  }
  return { self, stores, run, listeners }
}

const req = (url: string, init: { method?: string; mode?: string } = {}) => ({
  url: `https://x.test${url}`.replace('https://x.testhttp', 'http'),
  method: init.method ?? 'GET',
  mode: init.mode ?? 'no-cors',
})
const res = (body: string) => ({ body, clone: () => res(body) })

describe('service worker', () => {
  let online = true
  const network = vi.fn(async (r: unknown) => {
    if (!online) throw new Error('offline')
    return res(`net ${(r as { url: string }).url}`)
  })
  beforeEach(() => {
    online = true
    network.mockClear()
  })

  it('precaches the shell on install and takes over', async () => {
    const w = makeWorker(network)
    await w.run('install')
    expect(w.stores.get('strides-shell-v1')?.size).toBe(1)
    expect(w.self.skipWaiting).toHaveBeenCalled()
  })

  it('removes old caches on activate and claims clients', async () => {
    const w = makeWorker(network)
    await w.run('install')
    w.stores.set('strides-shell-v0', new Map())
    await w.run('activate')
    expect([...w.stores.keys()]).toEqual(['strides-shell-v1'])
    expect(w.self.clients.claim).toHaveBeenCalled()
  })

  it('pages: network first, and shows the saved page when offline', async () => {
    const w = makeWorker(network)
    await w.run('install')
    const page = req('/', { mode: 'navigate' })
    expect(await w.run('fetch', { request: page })).toMatchObject({
      body: 'net https://x.test/',
    })
    online = false
    expect(await w.run('fetch', { request: page })).toMatchObject({
      body: 'net https://x.test/',
    })
  })

  it('assets: cache first, fetched only once', async () => {
    const w = makeWorker(network)
    const asset = req('/assets/index-abc.js')
    await w.run('fetch', { request: asset })
    await w.run('fetch', { request: asset })
    expect(network).toHaveBeenCalledTimes(1)
  })

  it('leaves other sites, non-GET requests and other files alone', async () => {
    const w = makeWorker(network)
    expect(
      await w.run('fetch', {
        request: {
          url: 'https://abc.supabase.co/rest/v1/runs',
          method: 'GET',
          mode: 'cors',
        },
      }),
    ).toBeUndefined()
    expect(
      await w.run('fetch', {
        request: req('/assets/a.js', { method: 'POST' }),
      }),
    ).toBeUndefined()
    expect(await w.run('fetch', { request: req('/sw.js') })).toBeUndefined()
  })
})
