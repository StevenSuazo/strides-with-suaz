/**
 * duration.ts: run times as text, for the log form and the run page.
 *
 * parseDuration(text): seconds from "45:30" (minutes:seconds), "1:05:30"
 * (hours:minutes:seconds) or a plain number of minutes ("45"). A blank box is
 * undefined (nothing entered) and anything else that is not a time is null.
 * formatDuration(seconds): "38:30", or "1:05:30" from an hour up.
 */
export const parseDuration = (text: string): number | undefined | null => {
  const value = text.trim()
  if (value === '') return undefined
  if (/^\d+$/.test(value)) return Number(value) * 60
  const parts = value.split(':')
  if (parts.length < 2 || parts.length > 3) return null
  const [first, ...rest] = parts
  if (!/^\d+$/.test(first) || !rest.every((part) => /^\d{1,2}$/.test(part))) {
    return null
  }
  const numbers = parts.map(Number)
  const seconds = numbers[numbers.length - 1]
  const minutes = numbers.length === 3 ? numbers[1] : numbers[0]
  const hours = numbers.length === 3 ? numbers[0] : 0
  if (seconds > 59 || (numbers.length === 3 && minutes > 59)) return null
  return hours * 3600 + minutes * 60 + seconds
}

export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return hours > 0
    ? `${hours}:${two(minutes)}:${two(seconds)}`
    : `${minutes}:${two(seconds)}`
}
