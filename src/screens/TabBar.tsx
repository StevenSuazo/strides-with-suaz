/**
 * TabBar.tsx: the bottom navigation: Home, Plan, Log and More.
 *
 * It only shows which tab is current (aria-current="page") and reports taps
 * through onChange. The page decides what each tab contains.
 */
const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'plan', label: 'Plan' },
  { id: 'log', label: 'Log' },
  { id: 'more', label: 'More' },
] as const

export type TabId = (typeof TABS)[number]['id']

export const TabBar = ({
  current,
  onChange,
}: {
  current: TabId
  onChange: (tab: TabId) => void
}) => (
  <nav className="tab-bar" aria-label="Main">
    {TABS.map(({ id, label }) => (
      <button
        key={id}
        type="button"
        className={id === current ? 'tab active' : 'tab'}
        aria-current={id === current ? 'page' : undefined}
        onClick={() => onChange(id)}
      >
        {label}
      </button>
    ))}
  </nav>
)
