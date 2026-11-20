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

const signInAs = async (
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) => {
  const emailBox = await screen.findByLabelText('Email')
  if (email) await user.type(emailBox, email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginGate', () => {
  it('shows a loading message until the session is read', async () => {
    renderGate(createMemoryAuth())
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await screen.findByLabelText('Email')
  })

  it('shows the login form and hides the app when signed out', async () => {
    renderGate(createMemoryAuth())
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('hides the password as you type it', async () => {
    renderGate(createMemoryAuth())
    expect(await screen.findByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    )
  })

  it('shows the app after signing in with the right password', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth())
    await signInAs(user, 'me@example.com', 'password123')
    expect(await screen.findByText('The app')).toBeInTheDocument()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()
  })

  it('trims spaces around the email', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth())
    await signInAs(user, ' me@example.com ', 'password123')
    expect(await screen.findByText('me@example.com')).toBeInTheDocument()
  })

  it('shows why a wrong password failed and keeps the form', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth())
    await signInAs(user, 'me@example.com', 'wrong')
    expect(
      await screen.findByText('Invalid login credentials'),
    ).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('me@example.com')
  })

  it('shows an error for a bad email and signs nobody in', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth())
    await signInAs(user, 'nope', 'password123')
    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('asks for a password when it is empty', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth())
    await signInAs(user, 'me@example.com', '')
    expect(await screen.findByText('Enter your password.')).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('shows the error when signing in fails for another reason', async () => {
    const user = userEvent.setup()
    renderGate(createMemoryAuth({ signInError: new Error('Rate limit hit') }))
    await signInAs(user, 'me@example.com', 'password123')
    expect(await screen.findByText('Rate limit hit')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows the app and the email when already signed in', async () => {
    renderGate(createMemoryAuth({ user: me }))
    expect(await screen.findByText('The app')).toBeInTheDocument()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('keeps a sign-in that arrives before the first read finishes', async () => {
    const auth = createMemoryAuth()
    auth.getUser = () =>
      new Promise((resolve) => setTimeout(() => resolve(null), 20))
    renderGate(auth)
    await act(async () => {
      await auth.signIn('me@example.com', 'password123')
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
