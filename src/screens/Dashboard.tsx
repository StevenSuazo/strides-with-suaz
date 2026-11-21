/**
 * Dashboard.tsx: the main page, in four tabs.
 *
 * - Home: the week strip, today's workout and this week. Tapping today's
 *   workout opens the Today page in place of Home (the tab bar stays; the
 *   Back button, the phone's Back gesture or any tab closes it).
 * - Plan: the progress chart and this week's planned runs.
 * - Log: your runs and check-ins, each with a form and a list.
 * - More: backup and restore, plus whatever you pass as `account` (the
 *   Sign out card).
 * Loads the plan once with usePlan and shares it with the tabs. After any save
 * or delete it reloads, so the week's numbers (and next week's target) follow
 * your runs. Editing a run or a check-in swaps its form into edit mode. After a
 * restore, this week's availability and hand matches reload too. The week's
 * schedule and the open tab live here, so they survive changing tabs.
 * newId makes ids for new runs and check-ins and can be replaced in tests.
 */
import { useState, type ReactNode } from 'react'
import type { CheckIn, IsoDate, Run } from '../engine/types'
import { runKinds } from '../plan/runKinds'
import { todayInfo } from '../plan/todayInfo'
import { PLAN } from '../plan/settings'
import { usePlan, type PlanState } from '../plan/usePlan'
import { useStorage } from '../storage/useStorage'
import { BackupButton } from './BackupButton'
import { CheckInForm } from './CheckInForm'
import { CheckInList } from './CheckInList'
import { HomeTab } from './HomeTab'
import { LogRunForm } from './LogRunForm'
import { PlanTab } from './PlanTab'
import { RestoreButton } from './RestoreButton'
import { RunList } from './RunList'
import { TabBar, type TabId } from './TabBar'
import { TodayPage } from './TodayPage'
import { useHistoryPage } from './useHistoryPage'
import { useWeekSchedule } from './useWeekSchedule'

const defaultNewId = (): string => `app-${crypto.randomUUID()}`

type Ready = Extract<PlanState, { status: 'ready' }>

const Tabs = ({
  state,
  reload,
  today,
  newId,
  account,
}: {
  state: Ready
  reload: () => void
  today: IsoDate
  newId: () => string
  account?: ReactNode
}) => {
  const storage = useStorage()
  const [tab, setTab] = useState<TabId>('home')
  const todayPage = useHistoryPage()
  const [editing, setEditing] = useState<Run | undefined>()
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | undefined>()
  const {
    schedule,
    kinds: matchedKinds,
    refresh,
  } = useWeekSchedule(state.view, state.runs, today)

  const todayDetail =
    schedule.status === 'ready'
      ? todayInfo(schedule.weekStart, schedule.rows, schedule.extraRuns, today)
      : undefined

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
    setEditingCheckIn(undefined)
    reload()
  }

  const removeCheckIn = async (id: string) => {
    await storage.deleteCheckIn(id)
    if (editingCheckIn?.id === id) setEditingCheckIn(undefined)
    reload()
  }

  return (
    <>
      {tab === 'home' &&
        (todayPage.open && todayDetail ? (
          <TodayPage info={todayDetail} today={today} onBack={todayPage.hide} />
        ) : (
          <HomeTab
            view={state.view}
            today={today}
            schedule={schedule}
            onOpenToday={todayPage.show}
          />
        ))}
      {tab === 'plan' && (
        <PlanTab
          view={state.view}
          runs={state.runs}
          today={today}
          schedule={schedule}
        />
      )}
      {tab === 'log' && (
        <>
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
            <details open={editingCheckIn ? true : undefined}>
              <summary>
                {editingCheckIn ? 'Edit check-in' : 'Add a check-in'}
              </summary>
              <CheckInForm
                key={editingCheckIn?.id ?? 'new'}
                today={today}
                newId={newId}
                editing={editingCheckIn}
                onSave={saveCheckIn}
                onCancel={() => setEditingCheckIn(undefined)}
              />
            </details>
            <CheckInList
              checkIns={state.checkIns}
              onEdit={setEditingCheckIn}
              onDelete={removeCheckIn}
            />
          </section>
        </>
      )}
      {tab === 'more' && (
        <>
          <section className="card">
            <h2>Backup</h2>
            <BackupButton today={today} />
            <RestoreButton
              onRestored={() => {
                refresh()
                reload()
              }}
            />
          </section>
          {account}
        </>
      )}
      <TabBar
        current={tab}
        onChange={(next) => {
          if (todayPage.open) todayPage.hide()
          setTab(next)
        }}
      />
    </>
  )
}

export const Dashboard = ({
  today,
  newId = defaultNewId,
  account,
}: {
  today: IsoDate
  newId?: () => string
  account?: ReactNode
}) => {
  const { state, reload } = usePlan(today)

  if (state.status === 'loading') return <p>Loading your plan…</p>
  if (state.status === 'error') {
    return <p role="alert">{`Couldn't load your plan: ${state.message}`}</p>
  }
  return (
    <Tabs
      state={state}
      reload={reload}
      today={today}
      newId={newId}
      account={account}
    />
  )
}
