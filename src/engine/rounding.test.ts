import { describe, it } from 'vitest'

describe('roundMiles', () => {
  it.todo('rounds 4.04 down to 4.0')
  it.todo('rounds 4.06 up to 4.1')
  it.todo('returns 0 for 0')
  it.todo(
    'handles an exact half such as 4.25 by the rule written in the file header',
  )
  it.todo('removes floating-point noise: 0.1 + 0.2 gives 0.3')
  it.todo('throws a RangeError for NaN and Infinity')
})
