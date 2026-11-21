import { beforeEach, describe, expect, it } from 'vitest'
import { clearPlace, loadPlace, savePlace } from './locationStore'

const place = { lat: 40.65, lon: -73.95, label: 'Brooklyn, New York' }

beforeEach(() => localStorage.clear())

describe('locationStore', () => {
  it('has no place until one is saved', () => {
    expect(loadPlace()).toBeUndefined()
  })

  it('saves and loads a place', () => {
    savePlace(place)
    expect(loadPlace()).toEqual(place)
  })

  it('forgets a cleared place', () => {
    savePlace(place)
    clearPlace()
    expect(loadPlace()).toBeUndefined()
  })

  it('ignores a damaged value', () => {
    localStorage.setItem('strides.place', '{nope')
    expect(loadPlace()).toBeUndefined()
    localStorage.setItem('strides.place', JSON.stringify({ lat: 'x' }))
    expect(loadPlace()).toBeUndefined()
  })

  it('works with a store that refuses to save', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(loadPlace(broken)).toBeUndefined()
    expect(() => savePlace(place, broken)).not.toThrow()
    expect(() => clearPlace(broken)).not.toThrow()
  })
})
