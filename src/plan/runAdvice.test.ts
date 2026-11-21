import { describe, expect, it } from 'vitest'
import { adviceFor } from './runAdvice'

const kinds = ['easy', 'long', 'rest', 'extra'] as const

describe('adviceFor', () => {
  it.each(kinds)('has a summary and several tips for %s', (kind) => {
    const advice = adviceFor(kind)
    expect(advice.summary.length).toBeGreaterThan(10)
    expect(advice.tips.length).toBeGreaterThanOrEqual(2)
  })

  it('gives different advice for an easy run and a long run', () => {
    expect(adviceFor('easy').tips).not.toEqual(adviceFor('long').tips)
    expect(adviceFor('easy').summary).not.toBe(adviceFor('long').summary)
  })

  it('never talks about specific paces', () => {
    for (const kind of kinds) {
      const text = [adviceFor(kind).summary, ...adviceFor(kind).tips].join(' ')
      expect(text).not.toMatch(/\d+:\d+|per mile|min\/mi|\bpace\b/i)
    }
  })

  it('has no empty tips', () => {
    for (const kind of kinds) {
      for (const tip of adviceFor(kind).tips) {
        expect(tip.trim()).not.toBe('')
      }
    }
  })
})
