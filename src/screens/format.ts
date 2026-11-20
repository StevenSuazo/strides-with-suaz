/** format.ts: small display helpers shared by the screens. */
export const formatMiles = (value: number): string =>
  String(Number(value.toFixed(2)))

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-11-15" becomes "Sun, Nov 15". Date math is in UTC, so no time zone shift. */
export const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${day}`
}
