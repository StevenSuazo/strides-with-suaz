import { describe, expect, it } from 'vitest'
import type { Run } from '../engine/types'
import { runKinds } from './runKinds'

const run = (id: string, date: string, miles: number): Run => ({
  id,
  date,
  miles,
  source: 'in_app',
})
const START = '2026-11-09'

describe('runKinds', () => {
  it('has nothing for no runs', () => {
    expect(runKinds([], START)).toEqual({})
  })

  it('calls the only run of a week long', () => {
    expect(runKinds([run('a', '2026-11-11', 2.5)], START)).toEqual({
      a: 'long',
    })
  })

  it('calls the longest run of the week long and the rest easy', () => {
    const runs = [
      run('a', '2026-11-09', 2.05),
      run('b', '2026-11-11', 2.5),
      run('c', '2026-11-15', 4.01),
    ]
    expect(runKinds(runs, START)).toEqual({ a: 'easy', b: 'easy', c: 'long' })
  })

  it('breaks a tie with the earlier run', () => {
    const runs = [run('late', '2026-11-14', 3), run('early', '2026-11-10', 3)]
    expect(runKinds(runs, START)).toEqual({ early: 'long', late: 'easy' })
  })

  it('keeps weeks apart, Monday to Sunday from the plan start', () => {
    const runs = [run('sun', '2026-11-15', 4), run('mon', '2026-11-16', 2)]
    expect(runKinds(runs, START)).toEqual({ sun: 'long', mon: 'long' })
  })

  it('groups runs from before the plan starts into their own weeks', () => {
    const runs = [
      run('a', '2026-11-02', 5),
      run('b', '2026-11-08', 3),
      run('c', '2026-11-01', 6),
    ]
    expect(runKinds(runs, START)).toEqual({ a: 'long', b: 'easy', c: 'long' })
  })
})
