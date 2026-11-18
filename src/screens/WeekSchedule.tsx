/**
 * WeekSchedule.tsx: "Planned runs" for the week in progress, plus the
 * availability editor that drives it.
 *
 * Shows nothing before the plan starts or after it ends. Availability is
 * saved per week; a week with nothing saved starts with every day open.
 * Saving re-plans the week on screen. It does not change the gate, which
 * only looks at miles and pain.
 */
import { useEffect, useState } from 'react'
import { weekStartDate } from '../engine'
import type { WeekAvailability } from '../engine/types'
import type { PlanView } from '../plan/progress'
import { PLAN } from '../plan/settings'
import { useStorage } from '../storage/useStorage'
import { AvailabilityEditor } from './AvailabilityEditor'
import { PlannedWeek } from './PlannedWeek'

const ALL_OPEN: WeekAvailability = Array(7).fill('open')

export const WeekSchedule = ({ view }: { view: PlanView }) => {
  const storage = useStorage()
  const weekIndex = view.status === 'inProgress' ? view.weekIndex : undefined
  const [loaded, setLoaded] = useState<
    { weekIndex: number; availability: WeekAvailability } | undefined
  >()
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (weekIndex === undefined) return
    let active = true
    storage
      .getAvailability(weekIndex)
      .then((saved) => {
        if (active) setLoaded({ weekIndex, availability: saved ?? ALL_OPEN })
      })
      .catch((caught: unknown) => {
        if (active)
          setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      active = false
    }
  }, [storage, weekIndex])

  if (weekIndex === undefined || !view.target) return null
  if (error) return <p role="alert">{`Couldn't load availability: ${error}`}</p>
  if (!loaded || loaded.weekIndex !== weekIndex) return null

  const save = async (availability: WeekAvailability) => {
    await storage.saveAvailability(weekIndex, availability)
    setLoaded({ weekIndex, availability })
  }

  return (
    <section>
      <h2>Planned runs</h2>
      <PlannedWeek
        target={view.target}
        availability={loaded.availability}
        weekStart={weekStartDate(weekIndex, PLAN.startDate)}
      />
      <AvailabilityEditor
        key={loaded.weekIndex}
        value={loaded.availability}
        onSave={save}
      />
    </section>
  )
}
