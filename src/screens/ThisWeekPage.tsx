/**
 * ThisWeekPage.tsx: connects the plan hook to the ThisWeek screen.
 *
 * Shows a loading message, an error, or the screen. today is passed in so
 * tests can pick the date.
 */
import type { IsoDate } from '../engine/types'
import { usePlan } from '../plan/usePlan'
import { ThisWeek } from './ThisWeek'

export const ThisWeekPage = ({ today }: { today: IsoDate }) => {
  const { state } = usePlan(today)

  if (state.status === 'loading') return <p>Loading your plan…</p>
  if (state.status === 'error') {
    return <p role="alert">{`Couldn't load your plan: ${state.message}`}</p>
  }
  return <ThisWeek view={state.view} today={today} />
}
