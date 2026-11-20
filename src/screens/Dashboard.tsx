/**
 * Dashboard.tsx: the main page. This week, plus logging and fixing runs.
 *
 * Loads the plan once with usePlan and shares it with the pieces below: runs
 * and check-ins, each with a form and a list. After any save or delete it reloads, so the week's numbers (and next week's
 * target) follow your runs. Editing a run swaps the form into edit mode.
 * newId makes ids for new runs and can be replaced in tests.
 */
import { useState } from 'react'
import type { CheckIn, IsoDate, Run, RunKind } from '../engine/types'
import { runKinds } from '../plan/runKinds'
import { PLAN } from '../plan/settings'
import { usePlan } from '../plan/usePlan'
import { useStorage } from '../storage/useStorage'
import { BackupButton } from './BackupButton'
import { CheckInForm } from './CheckInForm'
import { CheckInList } from './CheckInList'
import { LogRunForm } from './LogRunForm'
import { ProgressChart } from './ProgressChart'
import { RunList } from './RunList'
import { WeekSchedule } from './WeekSchedule'
import { ThisWeek } from './ThisWeek'

const defaultNewId = (): string => `app-${crypto.randomUUID()}`

export const Dashboard = ({
  today,
  newId = defaultNewId,
}: {
  today: IsoDate
  newId?: () => string
}) => {
  const storage = useStorage()
  const { state, reload } = usePlan(today)
  const [editing, setEditing] = useState<Run | undefined>()
  const [matchedKinds, setMatchedKinds] = useState<Record<string, RunKind>>({})

  if (state.status === 'loading') return <p>Loading your plan…</p>
  if (state.status === 'error') {
    return <p role="alert">{`Couldn't load your plan: ${state.message}`}</p>
  }

  // Runs matched to this week's plan take the planned type; the rest use the
  // longest-run-of-the-week rule.
  const kinds = { ...runKinds(state.runs, PLAN.startDate), ...matchedKinds }

  const save = async (run: Run) => {
    await storage.saveRun(run)
    setEditing(undefined)
    reload()
  }

  const remove = async (id: string) => {
    await storage.deleteRun(id)
    if (editing?.id === id) setEditing(undefined)
    reload()
  }

  const saveCheckIn = async (checkIn: CheckIn) => {
    await storage.saveCheckIn(checkIn)
    reload()
  }

  const removeCheckIn = async (id: string) => {
    await storage.deleteCheckIn(id)
    reload()
  }

  return (
    <>
      <WeekSchedule
        view={state.view}
        runs={state.runs}
        today={today}
        summary={
          <>
            <ThisWeek view={state.view} today={today} />
            <ProgressChart view={state.view} />
          </>
        }
        onMatchedKinds={setMatchedKinds}
      />
      <section className="card">
        <h2>Runs</h2>
        <details open={editing ? true : undefined}>
          <summary>{editing ? 'Edit run' : 'Log a run'}</summary>
          <LogRunForm
            key={editing?.id ?? 'new'}
            today={today}
            editing={editing}
            newId={newId}
            onSave={save}
            onCancel={() => setEditing(undefined)}
          />
        </details>
        <RunList
          runs={state.runs}
          kinds={kinds}
          onEdit={setEditing}
          onDelete={remove}
        />
      </section>
      <section className="card">
        <h2>Check-ins</h2>
        <details>
          <summary>Add a check-in</summary>
          <CheckInForm today={today} newId={newId} onSave={saveCheckIn} />
        </details>
        <CheckInList checkIns={state.checkIns} onDelete={removeCheckIn} />
      </section>
      <section className="card">
        <h2>Backup</h2>
        <BackupButton today={today} />
      </section>
    </>
  )
}
