import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/layout/Header'
import { useAuthStore } from '@/stores/authStore'
import i18n from '@/i18n/config'

function renderHeader() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('Header', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    })
  })

  it('shows the authenticated user name as static text and signs out from a separate button', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    act(() => {
      useAuthStore.setState({
        user: {
          uid: 'user-1',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          photoURL: null,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signOut,
      })
    })

    renderHeader()

    expect(
      screen.queryByRole('button', { name: /Ada Lovelace/ }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByText('Ada Lovelace'))
    expect(signOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /登出/ }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
