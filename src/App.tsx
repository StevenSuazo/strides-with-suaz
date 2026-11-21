import type { ReactNode } from 'react'
import type { IsoDate } from './engine/types'
import { todayIso } from './plan/today'
import { Dashboard } from './screens/Dashboard'
import './App.css'

function App({
  today = todayIso(),
  account,
}: {
  today?: IsoDate
  account?: ReactNode
}) {
  return (
    <main>
      <h1>StridesWithSuaz</h1>
      <Dashboard today={today} account={account} />
    </main>
  )
}

export default App
