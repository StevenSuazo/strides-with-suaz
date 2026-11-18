import type { IsoDate } from './engine/types'
import { todayIso } from './plan/today'
import { Dashboard } from './screens/Dashboard'
import './App.css'

function App({ today = todayIso() }: { today?: IsoDate }) {
  return (
    <main>
      <h1>StridesWithSuaz</h1>
      <Dashboard today={today} />
    </main>
  )
}

export default App
