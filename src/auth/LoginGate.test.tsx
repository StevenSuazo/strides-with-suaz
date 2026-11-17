import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { LoginGate } from './LoginGate'
import { createMemoryAuth, type MemoryAuth } from './memory'

const me = { id: 'u1', email: 'me@example.com' }

const renderGate = (auth: MemoryAuth) =>
  render(
    <AuthProvider auth={auth}>
      <LoginGate>
        <p>The app</p>
      </LoginGate>
    </AuthProvider>,
  )

describe('LoginGate', () => {
  it('shows a loading message until the session is read', async () => {
    renderGate(createMemoryAuth())
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await screen.findByLabelText('Email')
  })

  it('shows the email form and hides the app when signed out', async () => {
    renderGate(createMemoryAuth())
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('shows an error for a bad email and sends nothing', async () => {
    const auth = createMemoryAuth()
    const user = userEvent.setup()
    renderGate(auth)
    await user.type(await screen.findByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))
    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(auth.sentLinks).toEqual([])
  })

  it('sends the address and asks you to check your email', async () => {
    const auth = createMemoryAuth()
    const user = userEvent.setup()
    renderGate(auth)
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))
    expect(auth.sentLinks).toEqual(['me@example.com'])
    expect(
      await screen.findByText('Check your email for a sign-in link.'),
    ).toBeInTheDocument()
  })

  it('shows the error when sending fails and keeps the form', async () => {
    const auth = createMemoryAuth({ sendError: new Error('Rate limit hit') })
    const user = userEvent.setup()
    renderGate(auth)
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))
    expect(await screen.findByText('Rate limit hit')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(
      screen.queryByText('Check your email for a sign-in link.'),
    ).not.toBeInTheDocument()
  })

  it('shows the app and the email when already signed in', async () => {
    renderGate(createMemoryAuth({ user: me }))
    expect(await screen.findByText('The app')).toBeInTheDocument()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('shows the app once the link is clicked', async () => {
    const auth = createMemoryAuth()
    renderGate(auth)
    await screen.findByLabelText('Email')
    await act(async () => {
      auth.completeSignIn('me@example.com')
    })
    expect(await screen.findByText('The app')).toBeInTheDocument()
  })

  it('keeps a sign-in that arrives before the first read finishes', async () => {
    const auth = createMemoryAuth()
    auth.getUser = () =>
      new Promise((resolve) => setTimeout(() => resolve(null), 20))
    renderGate(auth)
    await act(async () => {
      auth.completeSignIn('me@example.com')
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
    expect(screen.getByText('The app')).toBeInTheDocument()
  })

  it('stops listening when it unmounts', async () => {
    const auth = createMemoryAuth()
    const { unmount } = renderGate(auth)
    await screen.findByLabelText('Email')
    expect(auth.listenerCount()).toBe(1)
    unmount()
    expect(auth.listenerCount()).toBe(0)
  })

  it('returns to the form after signing out', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth({ user: me }))
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('shows why when the session cannot be read', async () => {
    renderGate(
      createMemoryAuth({
        getUserError: new Error('Missing VITE_SUPABASE_URL'),
      }),
    )
    expect(
      await screen.findByText(
        "Couldn't check your sign-in: Missing VITE_SUPABASE_URL",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })
})
