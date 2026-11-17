import { describe, expect, it } from 'vitest'
import { isValidEmail } from './email'

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('me@example.com')).toBe(true)
  })

  it('accepts surrounding spaces, which are trimmed before sending', () => {
    expect(isValidEmail('  me@example.com ')).toBe(true)
  })

  it('accepts a plus tag and a subdomain', () => {
    expect(isValidEmail('me+runs@mail.example.co')).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
  })

  it('rejects a missing @, a missing name, or a missing domain', () => {
    expect(isValidEmail('example.com')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('me@')).toBe(false)
  })

  it('rejects a domain with no dot', () => {
    expect(isValidEmail('me@example')).toBe(false)
  })

  it('rejects spaces inside the address and a second @', () => {
    expect(isValidEmail('me @example.com')).toBe(false)
    expect(isValidEmail('me@@example.com')).toBe(false)
  })
})
