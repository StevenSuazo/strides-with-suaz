import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Run, RunKind } from '../engine/types'
import { formatDate } from './format'
import { RunList } from './RunList'

const run = (
  id: string,
  date: string,
  miles: number,
  source: Run['source'] = 'in_app',
): Run => ({
  id,
  date,
  miles,
  source,
})

const setup = (
  runs: Run[],
  handlers: {
    onEdit?: (run: Run) => void
    onDelete?: (id: string) => Promise<void>
    onOpen?: (run: Run) => void
    kinds?: Record<string, RunKind>
  } = {},
) => {
  const edited: Run[] = []
  const deleted: string[] = []
  render(
    <RunList
      runs={runs}
      kinds={handlers.kinds ?? {}}
      onOpen={handlers.onOpen}
      onEdit={(r) => {
        handlers.onEdit?.(r)
        edited.push(r)
      }}
      onDelete={async (id) => {
        await handlers.onDelete?.(id)
        deleted.push(id)
      }}
    />,
  )
  return { edited, deleted, user: userEvent.setup() }
}

const openMenu = async (
  user: ReturnType<typeof userEvent.setup>,
  date: string,
) =>
  user.click(
    screen.getByRole('button', { name: `Actions for ${formatDate(date)} run` }),
  )

describe('RunList', () => {
  it('says so when there are no runs', () => {
    setup([])
    expect(screen.getByText('No runs logged yet.')).toBeInTheDocument()
  })

  it('lists runs newest first', () => {
    setup([
      run('a', '2026-11-09', 2.05),
      run('c', '2026-11-15', 4.01),
      run('b', '2026-11-11', 2.5),
    ])
    const items = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(items[0]).toContain('Sun, Nov 15: 4.01 miles')
    expect(items[1]).toContain('Wed, Nov 11: 2.5 miles')
    expect(items[2]).toContain('Mon, Nov 9: 2.05 miles')
  })

  it('marks runs that came from Strava', () => {
    setup([run('a', '2026-11-09', 2, 'strava')])
    expect(
      screen.getByText(/Mon, Nov 9: 2 miles \(Strava\)/),
    ).toBeInTheDocument()
  })

  it('shows only the ten most recent runs', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      run(`r${i}`, `2026-11-${String(i + 1).padStart(2, '0')}`, 1),
    )
    setup(many)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.queryByText(/Sun, Nov 1:/)).not.toBeInTheDocument()
    expect(screen.getByText(/Thu, Nov 12:/)).toBeInTheDocument()
  })

  it('hands the run to onEdit', async () => {
    const target = run('a', '2026-11-09', 2.05)
    const { edited, user } = setup([target])
    await openMenu(user, '2026-11-09')
    await user.click(
      screen.getByRole('menuitem', { name: 'Edit Mon, Nov 9 run' }),
    )
    expect(edited).toEqual([target])
  })

  it('asks before deleting, then deletes on confirm', async () => {
    const { deleted, user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await user.click(
      screen.getByRole('menuitem', { name: 'Delete Mon, Nov 9 run' }),
    )
    expect(deleted).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(deleted).toEqual(['a'])
  })

  it('keeps the run when you choose Keep', async () => {
    const { deleted, user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await user.click(
      screen.getByRole('menuitem', { name: 'Delete Mon, Nov 9 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Keep run' }))
    expect(deleted).toEqual([])
    expect(
      screen.getByRole('button', { name: 'Actions for Mon, Nov 9 run' }),
    ).toBeInTheDocument()
  })

  it('shows the error when deleting fails', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)], {
      onDelete: async () => {
        throw new Error('offline')
      },
    })
    await openMenu(user, '2026-11-09')
    await user.click(
      screen.getByRole('menuitem', { name: 'Delete Mon, Nov 9 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(
      await screen.findByText("Couldn't delete the run: offline"),
    ).toBeInTheDocument()
  })

  it("hides Edit and Delete until you open the run's menu", async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)])
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    const dots = screen.getByRole('button', {
      name: 'Actions for Mon, Nov 9 run',
    })
    expect(dots.getAttribute('aria-expanded')).toBe('false')
    await user.click(dots)
    expect(dots.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual([
      'Edit',
      'Delete',
    ])
  })

  it('closes the menu when you press the dots again', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await openMenu(user, '2026-11-09')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('closes the menu on Escape', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('closes the menu when you click elsewhere', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await user.click(screen.getByText(/Mon, Nov 9: 2.05 miles/))
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('has only one menu open at a time', async () => {
    const { user } = setup([
      run('a', '2026-11-09', 2),
      run('b', '2026-11-10', 3),
    ])
    await openMenu(user, '2026-11-09')
    await openMenu(user, '2026-11-10')
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    expect(
      screen.getByRole('menuitem', { name: 'Edit Tue, Nov 10 run' }),
    ).toBeInTheDocument()
  })

  it('closes the menu after choosing Edit', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)])
    await openMenu(user, '2026-11-09')
    await user.click(
      screen.getByRole('menuitem', { name: 'Edit Mon, Nov 9 run' }),
    )
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it("shows each run's type with a colour and a word", () => {
    setup([run('a', '2026-11-09', 2), run('b', '2026-11-10', 5)], {
      kinds: { a: 'easy', b: 'long' },
    })
    const [long, easy] = screen.getAllByRole('listitem')
    expect(long.querySelector('.dot-long')).not.toBeNull()
    expect(long.textContent).toContain('Long')
    expect(easy.querySelector('.dot-easy')).not.toBeNull()
    expect(easy.textContent).toContain('Easy')
  })

  it('shows no type when it is not known', () => {
    setup([run('a', '2026-11-09', 2)])
    const [item] = screen.getAllByRole('listitem')
    expect(item.querySelector('.dot')).toBeNull()
    expect(item.textContent).not.toMatch(/Easy|Long/)
  })
})

describe('RunList: opening a run', () => {
  it('opens a run when its text is tapped', async () => {
    const opened: Run[] = []
    const { user } = setup([run('a', '2026-11-15', 4.01)], {
      onOpen: (r) => opened.push(r),
    })
    await user.click(
      screen.getByRole('button', { name: /Sun, Nov 15: 4.01 miles/ }),
    )
    expect(opened.map((r) => r.id)).toEqual(['a'])
  })

  it('is plain text when nothing handles opening', () => {
    setup([run('a', '2026-11-15', 4.01)])
    expect(
      screen.queryByRole('button', { name: /Sun, Nov 15: 4.01 miles/ }),
    ).not.toBeInTheDocument()
  })
})
