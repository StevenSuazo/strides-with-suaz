import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryStorage } from './memory'
import { StorageProvider } from './StorageProvider'
import { useStorage } from './useStorage'

describe('StorageProvider', () => {
  it('gives components the storage it was given', () => {
    const storage = createMemoryStorage()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorageProvider storage={storage}>{children}</StorageProvider>
    )
    const { result } = renderHook(() => useStorage(), { wrapper })
    expect(result.current).toBe(storage)
  })

  it('makes useStorage throw outside a provider, naming the fix', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useStorage())).toThrow('StorageProvider')
    quiet.mockRestore()
  })
})
