import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { discoverMovies } from '@/services/tmdb/api'
import { requestAiRecommendations } from '@/services/supabase/aiRecommendations'
import { setRecommendationHistoryRemoteForTesting } from '@/services/supabase/recommendationHistory'
import type { Movie } from '@/services/tmdb/types'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/tmdb/api', () => ({
  discoverMovies: vi.fn(),
}))

vi.mock('@/services/supabase/aiRecommendations', () => ({
  requestAiRecommendations: vi.fn(),
}))

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => 'zh-TW'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  })
  setRecommendationHistoryRemoteForTesting(null)
})

function movie(id: number, title = `Movie ${id}`): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [28],
    id,
    original_language: 'en',
    original_title: title,
    overview: `Overview ${id}`,
    popularity: 10,
    poster_path: null,
    release_date: '2026-01-01',
    title,
    video: false,
    vote_average: 8,
    vote_count: 100,
  }
}

async function renderPicker() {
  const [{ AiMoviePicker }, { default: i18n }] = await Promise.all([
    import('@/components/features/ai-picker/AiMoviePicker'),
    import('@/i18n/config'),
  ])
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AiMoviePicker />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

describe('AiMoviePicker', () => {
  it(
    'does not skip a question when an option is double-clicked',
    async () => {
      await renderPicker()

      const excitingOption = screen.getByRole('button', { name: /刺激/ })

      fireEvent.click(excitingOption)
      fireEvent.click(excitingOption)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: '這次誰一起看？' }),
        ).toBeVisible()
      })
      expect(
        screen.queryByRole('heading', { name: '你想要什麼節奏？' }),
      ).not.toBeInTheDocument()
    },
    15000,
  )

  it(
    'shows emoji preference badges on answer options',
    async () => {
      await renderPicker()

      const excitingBadge = screen.getByText('⚡ 刺激')

      expect(excitingBadge).toHaveClass('rounded-full', 'text-lg')
    },
    15000,
  )

  it(
    'shows five TMDB movies before authenticated AI reasons return',
    async () => {
      vi.useFakeTimers()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      vi.mocked(discoverMovies).mockResolvedValue({
        page: 1,
        results: Array.from({ length: 6 }, (_, index) =>
          movie(index + 1, `Picked Movie ${index + 1}`),
        ),
        total_pages: 1,
        total_results: 6,
      })
      vi.mocked(requestAiRecommendations).mockImplementation(
        () => new Promise(() => undefined),
      )
      useAuthStore.setState({
        user: {
          uid: 'user-id',
          email: 'user@example.com',
          displayName: 'User',
          photoURL: null,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      await renderPicker()
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      vi.useRealTimers()
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /刺激/ }))
      await user.click(await screen.findByRole('button', { name: /朋友/ }))
      await user.click(await screen.findByRole('button', { name: /快節奏/ }))
      await user.click(await screen.findByRole('button', { name: /近年/ }))

      await waitFor(() => {
        expect(screen.getByText('Picked Movie 1')).toBeInTheDocument()
      })
      expect(screen.getByText('Picked Movie 5')).toBeInTheDocument()
      expect(screen.queryByText('Picked Movie 6')).not.toBeInTheDocument()
      expect(requestAiRecommendations).toHaveBeenCalled()
    },
    15000,
  )

  it(
    'shows movie overviews without calling AI when unauthenticated',
    async () => {
      const user = userEvent.setup()
      vi.mocked(discoverMovies).mockResolvedValue({
        page: 1,
        results: Array.from({ length: 5 }, (_, index) =>
          movie(index + 1, `Guest Movie ${index + 1}`),
        ),
        total_pages: 1,
        total_results: 5,
      })

      await renderPicker()

      await user.click(screen.getByRole('button', { name: /刺激/ }))
      await user.click(await screen.findByRole('button', { name: /朋友/ }))
      await user.click(await screen.findByRole('button', { name: /快節奏/ }))
      await user.click(await screen.findByRole('button', { name: /近年/ }))

      expect(await screen.findByText('Guest Movie 1')).toBeInTheDocument()
      expect(screen.getAllByText('Overview 1').length).toBeGreaterThan(1)
      expect(requestAiRecommendations).not.toHaveBeenCalled()
    },
    15000,
  )

  it(
    'falls back to overviews and stores fallback history when AI reasons fail',
    async () => {
      const user = userEvent.setup()
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      const createRun = vi.fn().mockResolvedValue(undefined)
      setRecommendationHistoryRemoteForTesting({
        listLatest: vi.fn(),
        deleteRun: vi.fn(),
        createRun,
      })
      vi.mocked(discoverMovies).mockResolvedValue({
        page: 1,
        results: Array.from({ length: 5 }, (_, index) =>
          movie(index + 1, `Fallback Movie ${index + 1}`),
        ),
        total_pages: 1,
        total_results: 5,
      })
      vi.mocked(requestAiRecommendations).mockRejectedValue(
        new Error('provider unavailable'),
      )
      useAuthStore.setState({
        user: {
          uid: 'user-id',
          email: 'user@example.com',
          displayName: 'User',
          photoURL: null,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      await renderPicker()

      await user.click(screen.getByRole('button', { name: /刺激/ }))
      await user.click(await screen.findByRole('button', { name: /朋友/ }))
      await user.click(await screen.findByRole('button', { name: /快節奏/ }))
      await user.click(await screen.findByRole('button', { name: /近年/ }))

      expect(await screen.findByText('Fallback Movie 1')).toBeInTheDocument()
      expect(
        await screen.findByText('AI 推薦理由暫時無法產生，已改顯示電影介紹。'),
      ).toBeInTheDocument()
      expect(screen.getAllByText('Overview 1').length).toBeGreaterThan(1)
      await waitFor(() => {
        expect(createRun).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-id',
            provider: 'fallback',
            model: 'local-overview',
          }),
        )
      })
      expect(consoleError).toHaveBeenCalledWith(
        'AI recommendation reasons failed',
        expect.any(Error),
      )
    },
    15000,
  )
})
