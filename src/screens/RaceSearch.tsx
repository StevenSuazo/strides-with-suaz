/**
 * RaceSearch.tsx: look up a half marathon and pick it.
 *
 * Type at least 3 letters of a race's name and press Search (or Enter). It
 * lists the halves it finds, each with its city and date. Picking one calls
 * onPick with that race and closes the list. While it works it says
 * "Searching…"; a failure shows its reason; no match says to enter a date
 * instead. If two searches overlap, only the newest one's answer is shown.
 * `search` is the lookup (the real one by default, a fake in tests). It is its
 * own small form, so put it beside the plan form, not inside it.
 */
import { useId, useRef, useState, type FormEvent } from 'react'
import { searchRaces, type RaceChoice } from '../races/search'
import { formatDate } from './format'

type Status =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; races: RaceChoice[] }

export const RaceSearch = ({
  onPick,
  search = searchRaces,
}: {
  onPick: (race: RaceChoice) => void
  search?: (words: string) => Promise<RaceChoice[]>
}) => {
  const id = useId()
  const [words, setWords] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const latest = useRef(0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (words.trim().length < 3) return
    const mine = ++latest.current
    setStatus({ kind: 'searching' })
    try {
      const races = await search(words.trim())
      if (mine === latest.current) setStatus({ kind: 'done', races })
    } catch (caught) {
      if (mine === latest.current) {
        setStatus({
          kind: 'error',
          message: caught instanceof Error ? caught.message : String(caught),
        })
      }
    }
  }

  const pick = (race: RaceChoice) => {
    latest.current++
    setStatus({ kind: 'idle' })
    onPick(race)
  }

  return (
    <form
      className="race-search"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label htmlFor={`${id}-words`}>Find a half marathon</label>
      <input
        id={`${id}-words`}
        type="search"
        placeholder="Race name, like NYC Half"
        value={words}
        onChange={(event) => setWords(event.target.value)}
      />
      <button type="submit" disabled={words.trim().length < 3}>
        Search
      </button>
      {status.kind === 'searching' && <p className="muted">Searching…</p>}
      {status.kind === 'error' && <p role="alert">{status.message}</p>}
      {status.kind === 'done' && status.races.length === 0 && (
        <p className="muted">
          No half marathons found. You can enter your own race date below.
        </p>
      )}
      {status.kind === 'done' && status.races.length > 0 && (
        <ul className="race-results">
          {status.races.map((race) => (
            <li key={race.id}>
              <button type="button" onClick={() => pick(race)}>
                <span>{race.name}</span>
                <span className="muted">
                  {`${[race.city, race.state].filter(Boolean).join(', ')} · ${formatDate(race.date)}, ${race.date.slice(0, 4)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
