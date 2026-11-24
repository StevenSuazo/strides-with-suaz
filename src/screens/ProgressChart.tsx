/**
 * ProgressChart.tsx: the whole plan at a glance, as a bar chart.
 *
 * One column per plan week. The line is the original target curve. Bars show
 * the miles you ran: finished weeks are green (hit the target), amber (close)
 * or red (short), this week's bar is blue and grows as you log runs, and
 * future weeks have no bar. Each finished week also carries a symbol so colour
 * is never the only signal: ✓ hit, ! close, ✕ short, plus ↓ if the gate
 * stepped back or ↻ if it repeated the week. The peak and race day are
 * labelled. A hidden table gives screen readers the same numbers in words.
 * It is hand-drawn SVG, so there is no chart library.
 */
import { buildChart, type ChartWeek } from '../plan/chartData'
import type { PlanView } from '../plan/progress'
import { usePlanSettings } from '../plan/usePlanSettings'
import { AFTER } from './decisionLabels'
import { formatDate, formatMiles } from './format'

const WIDTH = 380
const HEIGHT = 200
const LEFT = 30
const RIGHT = 6
const TOP = 22
const BOTTOM = 24

const LEVEL_WORDS = { hit: 'Hit target', close: 'Close', short: 'Short' }
const LEVEL_MARK = { hit: '✓', close: '!', short: '✕' }

const markFor = (week: ChartWeek): string | undefined => {
  if (week.kind !== 'done' || !week.level) return undefined
  const extra =
    week.decision === 'stepBack' ? '↓' : week.decision === 'repeat' ? '↻' : ''
  return `${LEVEL_MARK[week.level]}${extra}`
}

const resultWords = (week: ChartWeek): string => {
  if (week.kind === 'current') return 'In progress'
  if (week.kind === 'future' || !week.level) return 'Coming up'
  const then = week.decision ? `, then ${AFTER[week.decision]}` : ''
  return `${LEVEL_WORDS[week.level]}${then}`
}

export const ProgressChart = ({ view }: { view: PlanView }) => {
  const { raceDate } = usePlanSettings()
  const { weeks, maxMiles, peakIndex } = buildChart(view)
  const plotWidth = WIDTH - LEFT - RIGHT
  const plotHeight = HEIGHT - TOP - BOTTOM
  const slot = plotWidth / weeks.length
  const barWidth = slot * 0.62
  const x = (index: number): number => LEFT + slot * index + slot / 2
  const y = (miles: number): number => TOP + plotHeight * (1 - miles / maxMiles)

  const linePoints = weeks
    .map(
      (week, index) =>
        `${x(index).toFixed(1)},${y(week.curveMiles).toFixed(1)}`,
    )
    .join(' ')
  const peak = weeks[peakIndex]

  return (
    <section className="card progress-chart">
      <h2>Your plan</h2>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Weekly miles: target and actual"
      >
        {[0, maxMiles / 2, maxMiles].map((miles) => (
          <g key={miles}>
            <line
              className="grid"
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={y(miles)}
              y2={y(miles)}
            />
            <text
              className="axis-label"
              x={LEFT - 4}
              y={y(miles) + 3}
              textAnchor="end"
            >
              {formatMiles(miles)}
            </text>
          </g>
        ))}

        {weeks.map((week, index) => {
          if (week.kind === 'future' || week.actualMiles === undefined)
            return null
          const top = y(week.actualMiles)
          const mark = markFor(week)
          return (
            <g key={week.weekIndex}>
              <rect
                className={`bar ${week.kind === 'current' ? 'bar-current' : `bar-${week.level}`}`}
                x={x(index) - barWidth / 2}
                y={top}
                width={barWidth}
                height={y(0) - top}
                rx={2}
              />
              {mark && (
                <text
                  className="mark"
                  x={x(index)}
                  y={top - 3}
                  textAnchor="middle"
                >
                  {mark}
                </text>
              )}
            </g>
          )
        })}

        <polyline className="target-line" points={linePoints} fill="none" />
        <circle
          className="peak"
          cx={x(peakIndex)}
          cy={y(peak.curveMiles)}
          r={3}
        />
        <text
          className="peak-label"
          x={x(peakIndex)}
          y={y(peak.curveMiles) - 7}
          textAnchor="middle"
        >
          {formatMiles(peak.curveMiles)}
        </text>
        <text className="race-label" x={WIDTH - RIGHT} y={10} textAnchor="end">
          {`Race ${formatDate(raceDate)}`}
        </text>

        {weeks.map((week, index) => (
          <g key={week.weekIndex}>
            {week.kind === 'current' && (
              <circle
                className="week-ring"
                cx={x(index)}
                cy={HEIGHT - BOTTOM + 11}
                r={7.5}
              />
            )}
            <text
              className={`week-label${week.kind === 'current' ? ' current' : ''}`}
              x={x(index)}
              y={HEIGHT - BOTTOM + 14}
              textAnchor="middle"
            >
              {week.weekIndex}
            </text>
          </g>
        ))}
      </svg>
      <p className="muted legend">
        ✓ hit target · ! close · ✕ short · ↓ stepped back · ↻ repeated
      </p>

      <table className="sr-only">
        <caption>Weekly miles: target and actual</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Target</th>
            <th>Ran</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekIndex}>
              <th scope="row">{`Week ${week.weekIndex}`}</th>
              <td>{formatMiles(week.targetMiles ?? week.curveMiles)}</td>
              <td>
                {week.actualMiles === undefined
                  ? '—'
                  : formatMiles(week.actualMiles)}
              </td>
              <td>{resultWords(week)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
