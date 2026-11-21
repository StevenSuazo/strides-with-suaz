import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AccountCard } from './AccountCard'
import { AuthProvider } from './AuthProvider'
import { createMemoryAuth } from './memory'

const me = { id: 'u1', email: 'me@example.com' }

describe('AccountCard', () => {
  it('shows who is signed in', async () => {
    render(
      <AuthProvider auth={createMemoryAuth({ user: me })}>
        <AccountCard />
      </AuthProvider>,
    )
    expect(
      await screen.findByText('Signed in as me@example.com'),
    ).toBeInTheDocument()
  })

  it('signs out', async () => {
    const auth = createMemoryAuth({ user: me })
    render(
      <AuthProvider auth={auth}>
        <AccountCard />
      </AuthProvider>,
    )
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await auth.getUser()).toBeNull()
  })

  it('shows nothing when nobody is signed in', async () => {
    const auth = createMemoryAuth()
    const { container } = render(
      <AuthProvider auth={auth}>
        <AccountCard />
      </AuthProvider>,
    )
    await auth.getUser()
    expect(container).toBeEmptyDOMElement()
  })
})
