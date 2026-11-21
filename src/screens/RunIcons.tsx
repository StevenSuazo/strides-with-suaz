/**
 * RunIcons.tsx: two small white pictures for the run page header.
 *
 * RunnerIcon fills the space when a run has no details; ThumbsUpIcon sits
 * under the pace once it does. Both are labelled for screen readers. The
 * shapes are Material Design icons (Apache 2.0).
 */
const Icon = ({
  label,
  path,
  size,
}: {
  label: string
  path: string
  size: number
}) => (
  <svg
    role="img"
    aria-label={label}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#fff"
  >
    <path d={path} />
  </svg>
)

export const RunnerIcon = ({ size = 96 }: { size?: number }) => (
  <Icon
    label="Running"
    size={size}
    path="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"
  />
)

export const ThumbsUpIcon = ({ size = 64 }: { size?: number }) => (
  <Icon
    label="Thumbs up"
    size={size}
    path="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
  />
)
