/**
 * locationStore.ts: remembers where you run, on this device only.
 *
 * loadPlace / savePlace / clearPlace keep one Place in the browser's local
 * storage. A damaged value or a browser that blocks storage counts as "no
 * place saved" and never throws. The place never goes to the database.
 */
import type { Place } from './types'

const KEY = 'strides.place'

const isPlace = (value: unknown): value is Place => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.lat === 'number' &&
    typeof v.lon === 'number' &&
    typeof v.label === 'string'
  )
}

export const loadPlace = (store: Storage = localStorage): Place | undefined => {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    return isPlace(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export const savePlace = (
  place: Place,
  store: Storage = localStorage,
): void => {
  try {
    store.setItem(KEY, JSON.stringify(place))
  } catch {
    // Storage is blocked: the place just will not be remembered.
  }
}

export const clearPlace = (store: Storage = localStorage): void => {
  try {
    store.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
