import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMovieDetail } from '@/hooks/useMovieDetail'
import { getMediaDetail } from '@/services/supabase/mediaDetail'
import { useLanguageStore } from '@/stores/languageStore'

vi.mock('@/services/supabase/mediaDetail', () => ({ getMediaDetail: vi.fn() }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useMovieDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLanguageStore.setState({ language: 'zh-TW' })
  })

  it('loads the whole detail with one query and updates the locale', async () => {
    vi.mocked(getMediaDetail).mockResolvedValue({
      detail: { id: 42 },
      credits: { cast: [] },
      videos: { results: [] },
      omdb: null,
    } as unknown as Awaited<ReturnType<typeof getMediaDetail>>)
    const { result, rerender } = renderHook(() => useMovieDetail(42, 'tv'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.detail?.id).toBe(42))
    expect(getMediaDetail).toHaveBeenCalledOnce()
    expect(getMediaDetail).toHaveBeenCalledWith(
      'tv',
      42,
      'zh-TW',
      expect.any(AbortSignal),
    )

    act(() => useLanguageStore.setState({ language: 'en' }))
    rerender()
    await waitFor(() => expect(getMediaDetail).toHaveBeenCalledTimes(2))
    expect(getMediaDetail).toHaveBeenLastCalledWith(
      'tv',
      42,
      'en-US',
      expect.any(AbortSignal),
    )
  })

  it('shows an error for an invalid route ID without an endless skeleton', () => {
    const { result } = renderHook(() => useMovieDetail(Number.NaN), { wrapper })
    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(getMediaDetail).not.toHaveBeenCalled()
  })
})
