/**
 * geolocation.ts: asks the phone or browser where you are.
 *
 * requestPosition(geo?): a Place labelled "Your location", or a rejection with
 * a plain reason: permission refused, position not found, or no support. Only
 * call it from a button tap, so nothing asks for permission on page load.
 */
import type { Place } from './types'

export const requestPosition = (
  geo: Geolocation | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.geolocation,
): Promise<Place> =>
  new Promise((resolve, reject) => {
    if (!geo) {
      reject(new Error("This browser can't share your location."))
      return
    }
    geo.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: 'Your location',
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? 'Location is turned off for this site.'
              : "Couldn't find your location.",
          ),
        ),
      { timeout: 10000, maximumAge: 600000 },
    )
  })
