/**
 * register.ts: turns on the service worker so the app can be installed.
 *
 * registerServiceWorker(prod?, nav?) returns true if it registered. It only
 * does anything in the production build (not in npm run dev, where a cached
 * worker would get in the way), and only where the browser supports it. A
 * failure to register is logged and ignored: the app works fine without it.
 */
export const registerServiceWorker = async (
  prod: boolean = import.meta.env.PROD,
  nav: { serviceWorker?: Pick<ServiceWorkerContainer, 'register'> } = navigator,
): Promise<boolean> => {
  if (!prod || !nav.serviceWorker) return false
  try {
    await nav.serviceWorker.register('/sw.js')
    return true
  } catch (error) {
    console.warn('Service worker did not register:', error)
    return false
  }
}
