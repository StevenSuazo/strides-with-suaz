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

/** Two dates as a range: "Nov 9–15", or "Nov 30 – Dec 6" across a month. */
export const formatRange = (start: string, end: string): string => {
  const [, startMonth, startDay] = start.split('-').map(Number)
  const [, endMonth, endDay] = end.split('-').map(Number)
  return startMonth === endMonth
    ? `${MONTHS[startMonth - 1]} ${startDay}–${endDay}`
    : `${MONTHS[startMonth - 1]} ${startDay} – ${MONTHS[endMonth - 1]} ${endDay}`
}
