import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('has Home, Plan, Log and More in order, in a Main navigation', () => {
    render(<TabBar current="home" onChange={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      Array.from(nav.querySelectorAll('button')).map((b) => b.textContent),
    ).toEqual(['Home', 'Plan', 'Log', 'More'])
  })

  it('marks only the current tab', () => {
    render(<TabBar current="log" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Log' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    for (const name of ['Home', 'Plan', 'More']) {
      expect(screen.getByRole('button', { name })).not.toHaveAttribute(
        'aria-current',
      )
    }
  })

  it('tells you which tab was tapped', async () => {
    const onChange = vi.fn()
    render(<TabBar current="home" onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'More' }))
    expect(onChange).toHaveBeenCalledWith('more')
  })
})
