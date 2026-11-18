import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Run } from '../engine/types'
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
  } = {},
) => {
  const edited: Run[] = []
  const deleted: string[] = []
  render(
    <RunList
      runs={runs}
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
    expect(items[0]).toContain('2026-11-15: 4.01 miles')
    expect(items[1]).toContain('2026-11-11: 2.5 miles')
    expect(items[2]).toContain('2026-11-09: 2.05 miles')
  })

  it('marks runs that came from Strava', () => {
    setup([run('a', '2026-11-09', 2, 'strava')])
    expect(
      screen.getByText(/2026-11-09: 2 miles \(Strava\)/),
    ).toBeInTheDocument()
  })

  it('shows only the ten most recent runs', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      run(`r${i}`, `2026-11-${String(i + 1).padStart(2, '0')}`, 1),
    )
    setup(many)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.queryByText(/2026-11-01:/)).not.toBeInTheDocument()
    expect(screen.getByText(/2026-11-12:/)).toBeInTheDocument()
  })

  it('hands the run to onEdit', async () => {
    const target = run('a', '2026-11-09', 2.05)
    const { edited, user } = setup([target])
    await user.click(
      screen.getByRole('button', { name: 'Edit 2026-11-09 run' }),
    )
    expect(edited).toEqual([target])
  })

  it('asks before deleting, then deletes on confirm', async () => {
    const { deleted, user } = setup([run('a', '2026-11-09', 2.05)])
    await user.click(
      screen.getByRole('button', { name: 'Delete 2026-11-09 run' }),
    )
    expect(deleted).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(deleted).toEqual(['a'])
  })

  it('keeps the run when you choose Keep', async () => {
    const { deleted, user } = setup([run('a', '2026-11-09', 2.05)])
    await user.click(
      screen.getByRole('button', { name: 'Delete 2026-11-09 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Keep run' }))
    expect(deleted).toEqual([])
    expect(
      screen.getByRole('button', { name: 'Delete 2026-11-09 run' }),
    ).toBeInTheDocument()
  })

  it('shows the error when deleting fails', async () => {
    const { user } = setup([run('a', '2026-11-09', 2.05)], {
      onDelete: async () => {
        throw new Error('offline')
      },
    })
    await user.click(
      screen.getByRole('button', { name: 'Delete 2026-11-09 run' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(
      await screen.findByText("Couldn't delete the run: offline"),
    ).toBeInTheDocument()
  })
})
