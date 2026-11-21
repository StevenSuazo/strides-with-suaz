import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RowMenu } from './RowMenu'

const setup = () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <>
      <RowMenu
        label="Actions for A"
        editLabel="Edit A"
        deleteLabel="Delete A"
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <RowMenu
        label="Actions for B"
        editLabel="Edit B"
        deleteLabel="Delete B"
        onEdit={() => {}}
        onDelete={() => {}}
      />
      <p>Elsewhere</p>
    </>,
  )
  return { onEdit, onDelete, user: userEvent.setup() }
}

describe('RowMenu', () => {
  it('starts closed', () => {
    setup()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Actions for A' }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens with Edit and Delete, and closes when the button is clicked again', async () => {
    const { user } = setup()
    const dots = screen.getByRole('button', { name: 'Actions for A' })
    await user.click(dots)
    expect(dots).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Edit A' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Delete A' }),
    ).toBeInTheDocument()
    await user.click(dots)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onEdit and closes', async () => {
    const { user, onEdit, onDelete } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions for A' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit A' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onDelete and closes', async () => {
    const { user, onEdit, onDelete } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions for A' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete A' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions for A' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on a click elsewhere', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions for A' }))
    await user.click(screen.getByText('Elsewhere'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('keeps only one menu open at a time', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions for A' }))
    await user.click(screen.getByRole('button', { name: 'Actions for B' }))
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menuitem', { name: 'Edit B' })).toBeInTheDocument()
  })
})
