import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CheckIn } from '../engine/types'
import { CheckInList } from './CheckInList'

const checkIn = (
  id: string,
  date: string,
  overrides: Partial<CheckIn> = {},
): CheckIn => ({
  id,
  date,
  feel: 'good',
  kind: 'afterRun',
  entries: [],
  ...overrides,
})

const setup = (
  checkIns: CheckIn[],
  onDelete: (id: string) => Promise<void> = async () => {},
) => {
  const deleted: string[] = []
  render(
    <CheckInList
      checkIns={checkIns}
      onDelete={async (id) => {
        await onDelete(id)
        deleted.push(id)
      }}
    />,
  )
  return { deleted, user: userEvent.setup() }
}

describe('CheckInList', () => {
  it('says so when there are none', () => {
    setup([])
    expect(screen.getByText('No check-ins yet.')).toBeInTheDocument()
  })

  it('describes a check-in with no pain', () => {
    setup([checkIn('a', '2026-11-15')])
    expect(
      screen.getByText('Sun, Nov 15: after a run, felt good, no pain.'),
    ).toBeInTheDocument()
  })

  it('describes the sore spots, the side, and the note', () => {
    setup([
      checkIn('a', '2026-11-16', {
        kind: 'nextMorning',
        feel: 'okay',
        entries: [
          { area: 'knee', side: 'left', pain: 2 },
          { area: 'other', side: 'na', pain: 1, otherLabel: 'toe' },
        ],
        note: 'tight at the end',
      }),
    ])
    expect(
      screen.getByText(
        'Mon, Nov 16: next morning, felt okay, knee (left) 2/10; toe 1/10. Note: tight at the end',
      ),
    ).toBeInTheDocument()
  })

  it('lists newest first', () => {
    setup([
      checkIn('a', '2026-11-10'),
      checkIn('c', '2026-11-16'),
      checkIn('b', '2026-11-12'),
    ])
    const text = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(text[0]).toContain('Mon, Nov 16')
    expect(text[1]).toContain('Thu, Nov 12')
    expect(text[2]).toContain('Tue, Nov 10')
  })

  it('shows only the ten most recent', () => {
    setup(
      Array.from({ length: 12 }, (_, i) =>
        checkIn(`c${i}`, `2026-11-${String(i + 1).padStart(2, '0')}`),
      ),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.queryByText(/Sun, Nov 1:/)).not.toBeInTheDocument()
  })

  it('asks before deleting, then deletes on confirm', async () => {
    const { deleted, user } = setup([checkIn('a', '2026-11-15')])
    await user.click(
      screen.getByRole('button', { name: 'Delete Sun, Nov 15 check-in' }),
    )
    expect(deleted).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(deleted).toEqual(['a'])
  })

  it('keeps the check-in when you choose Keep', async () => {
    const { deleted, user } = setup([checkIn('a', '2026-11-15')])
    await user.click(
      screen.getByRole('button', { name: 'Delete Sun, Nov 15 check-in' }),
    )
    await user.click(screen.getByRole('button', { name: 'Keep check-in' }))
    expect(deleted).toEqual([])
  })

  it('shows the error when deleting fails', async () => {
    const { user } = setup([checkIn('a', '2026-11-15')], async () => {
      throw new Error('offline')
    })
    await user.click(
      screen.getByRole('button', { name: 'Delete Sun, Nov 15 check-in' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(
      await screen.findByText("Couldn't delete the check-in: offline"),
    ).toBeInTheDocument()
  })
})
