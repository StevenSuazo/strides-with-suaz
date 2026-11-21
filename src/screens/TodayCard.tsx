/**
 * TodayCard.tsx: today's workout, like the card at the top of Runna.
 *
 * A planned run shows its type (Easy run or Long run), the date, the miles
 * and a chip: "To do", or "Done" with the miles you actually ran. The left
 * edge is blue for an easy run and purple for a long one, the same colours as
 * the week strip. With nothing planned it says "Rest day" and what comes next
 * this week; if you logged a run anyway it shows that as an "Extra run".
 * Tapping the card calls onOpen, which opens the Today page; once today's
 * run is logged, and onOpenRun is given, it opens that run's page instead. Shows nothing
 * when today is outside the week given. It does no loading.
 */
import type { IsoDate, Run } from '../engine/types'
import { todayInfo } from '../plan/todayInfo'
import { dateOfDay, type PlannedRow } from '../plan/weekMatch'
import { formatDate, formatMiles } from './format'

export const TodayCard = ({
  weekStart,
  rows,
  extraRuns,
  today,
  onOpen,
  onOpenRun,
}: {
  weekStart: IsoDate
  rows: PlannedRow[]
  extraRuns: Run[]
  today: IsoDate
  onOpen: () => void
  onOpenRun?: (run: Run) => void
}) => {
  const info = todayInfo(weekStart, rows, extraRuns, today)
  if (!info) return null

  // Once today's run is logged (planned or extra), the card opens that run.
  const todayRun = onOpenRun
    ? (rows.find((row) => dateOfDay(weekStart, row.dayIndex) === today)?.run ??
      extraRuns.find((run) => run.date === today))
    : undefined

  return (
    <section className="card today-card">
      <h2>Today&apos;s workout</h2>
      <button
        type="button"
        className={`today-item kind-${info.kind}`}
        aria-label={todayRun ? "Open today's run" : "Open today's workout"}
        onClick={todayRun ? () => onOpenRun?.(todayRun) : onOpen}
      >
        <span className="today-main">
          <span className="today-title">{info.title}</span>
          <span className="muted">{formatDate(today)}</span>
          {info.next && (
            <span className="muted">
              {`Next: ${formatDate(info.next.date)}, ${info.next.kind} run, ${formatMiles(info.next.miles)} miles`}
            </span>
          )}
        </span>
        {info.miles !== undefined && (
          <span className="today-miles">{`${formatMiles(info.miles)} miles`}</span>
        )}
        {info.status && (
          <span
            className={`chip ${info.status === 'done' ? 'chip-done' : 'chip-upcoming'}`}
          >
            {info.status === 'done' ? 'Done' : 'To do'}
          </span>
        )}
        {info.ran !== undefined && (
          <span className="muted today-ran">{`Ran ${formatMiles(info.ran)} miles`}</span>
        )}
      </button>
    </section>
  )
}
