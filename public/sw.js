/*
 * sw.js: the service worker. It makes the app installable and quick to open.
 *
 * - Pages: the network first, so a new deploy shows up right away. If you are
 *   offline, the last page that loaded is shown instead.
 * - Built files under /assets/ (their names change on every build, so they
 *   never go stale): the cache first, then the network.
 * - Everything else is left alone: other sites (Supabase, login), anything
 *   that is not a GET, and other files on this site. Your data is never cached.
 * Your runs come from Supabase, so offline you get the app but not your data.
 */
const VERSION = 'v1'
const SHELL = `strides-shell-${VERSION}`
const ASSETS = `strides-assets-${VERSION}`
const SHELL_FILES = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== SHELL && name !== ASSETS)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSETS).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
})
