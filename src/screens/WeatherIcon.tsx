/**
 * WeatherIcon.tsx: a small picture for a weather condition.
 *
 * Plain SVG drawn in white so it sits on the coloured Today header. Each one
 * is labelled for screen readers with the same words as conditionLabel.
 */
import { conditionLabel } from '../weather/conditions'
import type { Condition } from '../weather/types'

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

const Sun = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g stroke="#fde68a" strokeWidth="3" strokeLinecap="round">
    <circle cx={cx} cy={cy} r={r} fill="#fbbf24" stroke="none" />
    {SUN_RAYS.map((angle) => (
      <line
        key={angle}
        x1={cx}
        y1={cy - r - 4}
        x2={cx}
        y2={cy - r - 9}
        transform={`rotate(${angle} ${cx} ${cy})`}
      />
    ))}
  </g>
)

const CLOUD = 'M18 44a9 9 0 0 1 2-17.8A12 12 0 0 1 43 24a10 10 0 0 1 3 20Z'

const Cloud = ({ y = 0, fill = '#fff' }: { y?: number; fill?: string }) => (
  <path d={CLOUD} transform={`translate(0 ${y})`} fill={fill} />
)

const Drops = () => (
  <g stroke="#bfdbfe" strokeWidth="3" strokeLinecap="round">
    <line x1="20" y1="52" x2="17" y2="58" />
    <line x1="31" y1="52" x2="28" y2="58" />
    <line x1="42" y1="52" x2="39" y2="58" />
  </g>
)

const Flakes = () => (
  <g fill="#fff">
    <circle cx="20" cy="55" r="2" />
    <circle cx="31" cy="57" r="2" />
    <circle cx="42" cy="55" r="2" />
  </g>
)

const Bolt = () => <path d="M33 46 26 56h6l-3 8 10-12h-6l3-6Z" fill="#fde047" />

const picture = (condition: Condition) => {
  switch (condition) {
    case 'clear':
      return <Sun cx={32} cy={32} r={12} />
    case 'partly':
      return (
        <>
          <Sun cx={24} cy={24} r={9} />
          <Cloud y={6} />
        </>
      )
    case 'cloudy':
      return <Cloud fill="#e2e8f0" />
    case 'fog':
      return (
        <>
          <Cloud y={-6} fill="#e2e8f0" />
          <g stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round">
            <line x1="14" y1="48" x2="50" y2="48" />
            <line x1="20" y1="55" x2="44" y2="55" />
          </g>
        </>
      )
    case 'rain':
      return (
        <>
          <Cloud y={-6} fill="#e2e8f0" />
          <Drops />
        </>
      )
    case 'snow':
      return (
        <>
          <Cloud y={-6} fill="#e2e8f0" />
          <Flakes />
        </>
      )
    case 'storm':
      return (
        <>
          <Cloud y={-8} fill="#cbd5e1" />
          <Bolt />
        </>
      )
  }
}

export const WeatherIcon = ({
  condition,
  size = 56,
}: {
  condition: Condition
  size?: number
}) => (
  <svg
    role="img"
    aria-label={conditionLabel(condition)}
    width={size}
    height={size}
    viewBox="0 0 64 64"
  >
    {picture(condition)}
  </svg>
)
