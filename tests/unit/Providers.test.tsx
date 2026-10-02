import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/providers'
import { useAuthStore } from '@/stores/authStore'

const initializeAuth = useAuthStore.getState().initializeAuth

afterEach(() => {
  useAuthStore.setState({ initializeAuth })
})

describe('Providers', () => {
  it('cleans up an auth subscription that resolves after Strict Mode cleanup', async () => {
    const resolvers: Array<(unsubscribe: () => void) => void> = []
    const firstUnsubscribe = vi.fn()
    const secondUnsubscribe = vi.fn()

    useAuthStore.setState({
      initializeAuth: vi.fn<() => Promise<() => void>>(
        () =>
          new Promise<() => void>((resolve) => {
            resolvers.push(resolve)
          }),
      ),
    })

    const view = render(
      <StrictMode>
        <Providers>
          <div>content</div>
        </Providers>
      </StrictMode>,
    )

    expect(screen.getByText('content')).toBeInTheDocument()
    expect(resolvers).toHaveLength(2)

    await act(async () => {
      resolvers[0]?.(firstUnsubscribe)
      resolvers[1]?.(secondUnsubscribe)
      await Promise.resolve()
    })

    expect(firstUnsubscribe).toHaveBeenCalledOnce()
    expect(secondUnsubscribe).not.toHaveBeenCalled()

    view.unmount()
    expect(secondUnsubscribe).toHaveBeenCalledOnce()
  })
})
