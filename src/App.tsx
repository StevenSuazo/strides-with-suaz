import type { IsoDate } from './engine/types'
import { todayIso } from './plan/today'
import { ThisWeekPage } from './screens/ThisWeekPage'
import './App.css'

function App({ today = todayIso() }: { today?: IsoDate }) {
  return (
    <main>
      <h1>StridesWithSuaz</h1>
      <ThisWeekPage today={today} />
    </main>
  )
}

export default App
