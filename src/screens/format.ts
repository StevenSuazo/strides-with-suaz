/** format.ts: small display helpers shared by the screens. */
export const formatMiles = (value: number): string =>
  String(Number(value.toFixed(2)))
