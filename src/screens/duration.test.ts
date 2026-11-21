import { describe, expect, it } from 'vitest'
import { formatDuration, parseDuration } from './duration'

describe('parseDuration', () => {
  it('reads minutes:seconds', () => {
    expect(parseDuration('38:30')).toBe(2310)
    expect(parseDuration(' 5:05 ')).toBe(305)
  })

  it('reads hours:minutes:seconds', () => {
    expect(parseDuration('1:05:30')).toBe(3930)
  })

  it('reads a plain number as minutes', () => {
    expect(parseDuration('45')).toBe(2700)
  })

  it('is undefined for a blank box', () => {
    expect(parseDuration('')).toBeUndefined()
    expect(parseDuration('   ')).toBeUndefined()
  })

  it('is null for anything that is not a time', () => {
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('12:75')).toBeNull()
    expect(parseDuration('1:75:00')).toBeNull()
    expect(parseDuration('1:2:3:4')).toBeNull()
    expect(parseDuration('12:')).toBeNull()
    expect(parseDuration('-5:00')).toBeNull()
    expect(parseDuration('4.5')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('shows minutes:seconds under an hour', () => {
    expect(formatDuration(2310)).toBe('38:30')
    expect(formatDuration(305)).toBe('5:05')
  })

  it('shows hours from an hour up', () => {
    expect(formatDuration(3930)).toBe('1:05:30')
    expect(formatDuration(3600)).toBe('1:00:00')
  })
})
