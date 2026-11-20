import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './register'

describe('registerServiceWorker', () => {
  it('registers /sw.js in production', async () => {
    const register = vi.fn().mockResolvedValue({})
    expect(
      await registerServiceWorker(true, { serviceWorker: { register } }),
    ).toBe(true)
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('does nothing outside production', async () => {
    const register = vi.fn()
    expect(
      await registerServiceWorker(false, { serviceWorker: { register } }),
    ).toBe(false)
    expect(register).not.toHaveBeenCalled()
  })

  it('does nothing when the browser has no service workers', async () => {
    expect(await registerServiceWorker(true, {})).toBe(false)
  })

  it('swallows a failed registration', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const register = vi.fn().mockRejectedValue(new Error('nope'))
    expect(
      await registerServiceWorker(true, { serviceWorker: { register } }),
    ).toBe(false)
    warn.mockRestore()
  })
})
