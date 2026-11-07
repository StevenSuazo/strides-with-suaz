import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL only auto-cleans when test globals exist; we import from 'vitest'
// explicitly, so unmount rendered components after each test ourselves.
afterEach(() => {
  cleanup()
})
