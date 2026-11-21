import { describe, expect, it } from 'vitest'
import { requestPosition } from './geolocation'

const fake = (
  behave: (ok: PositionCallback, fail: PositionErrorCallback) => void,
) => ({ getCurrentPosition: behave }) as unknown as Geolocation

describe('requestPosition', () => {
  it('gives your place when the phone shares its location', async () => {
    const place = await requestPosition(
      fake((ok) =>
        ok({
          coords: { latitude: 40.7, longitude: -74 },
        } as GeolocationPosition),
      ),
    )
    expect(place).toEqual({ lat: 40.7, lon: -74, label: 'Your location' })
  })

  it('says so when permission is refused', async () => {
    await expect(
      requestPosition(
        fake((_ok, fail) =>
          fail({ code: 1, message: 'denied' } as GeolocationPositionError),
        ),
      ),
    ).rejects.toThrow('Location is turned off for this site.')
  })

  it('says so when the position is unavailable or times out', async () => {
    await expect(
      requestPosition(
        fake((_ok, fail) =>
          fail({ code: 2, message: 'x' } as GeolocationPositionError),
        ),
      ),
    ).rejects.toThrow("Couldn't find your location.")
    await expect(
      requestPosition(
        fake((_ok, fail) =>
          fail({ code: 3, message: 'x' } as GeolocationPositionError),
        ),
      ),
    ).rejects.toThrow("Couldn't find your location.")
  })

  it('says so when the browser has no location support', async () => {
    await expect(requestPosition(undefined)).rejects.toThrow(
      "This browser can't share your location.",
    )
  })
})
