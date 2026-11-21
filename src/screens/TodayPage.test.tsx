import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TodayInfo } from '../plan/todayInfo'
import { TodayPage } from './TodayPage'

const show = (info: TodayInfo, onBack = () => {}) =>
  render(<TodayPage info={info} today="2026-11-20" onBack={onBack} />)

describe('TodayPage', () => {
  it('shows a long run with its date, miles and status', () => {
    show({ kind: 'long', title: 'Long run', miles: 4.7, status: 'todo' })
    expect(
      screen.getByRole('heading', { name: 'Long run' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Fri, Nov 20')).toBeInTheDocument()
    expect(screen.getByText('4.7 miles')).toBeInTheDocument()
    expect(screen.getByText('To do')).toBeInTheDocument()
  })

  it('shows the long-run advice and the disclaimer', () => {
    show({ kind: 'long', title: 'Long run', miles: 4.7, status: 'todo' })
    expect(screen.getByText(/longest run of your week/)).toBeInTheDocument()
    expect(screen.getByText(/Bring water/)).toBeInTheDocument()
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument()
    expect(screen.queryByText(/conversational/)).not.toBeInTheDocument()
  })

  it('shows the easy-run advice for an easy run', () => {
    show({ kind: 'easy', title: 'Easy run', miles: 2.3, status: 'todo' })
    expect(screen.getByText(/conversational/)).toBeInTheDocument()
  })

  it('says done and how far you ran', () => {
    show({
      kind: 'easy',
      title: 'Easy run',
      miles: 2.3,
      status: 'done',
      ran: 2.4,
    })
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Ran 2.4 miles')).toBeInTheDocument()
  })

  it('shows a rest day with what is next', () => {
    show({
      kind: 'rest',
      title: 'Rest day',
      next: { date: '2026-11-22', kind: 'long', miles: 5 },
    })
    expect(
      screen.getByRole('heading', { name: 'Rest day' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No run planned today/)).toBeInTheDocument()
    expect(
      screen.getByText('Next: Sun, Nov 22, long run, 5 miles'),
    ).toBeInTheDocument()
  })

  it('shows an extra run', () => {
    show({ kind: 'extra', title: 'Extra run', miles: 3, status: 'done' })
    expect(screen.getByText(/without a run planned/)).toBeInTheDocument()
    expect(screen.getByText('3 miles')).toBeInTheDocument()
  })

  it('goes back when Back is pressed', async () => {
    const onBack = vi.fn()
    show(
      { kind: 'easy', title: 'Easy run', miles: 2.3, status: 'todo' },
      onBack,
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Back to Home' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
