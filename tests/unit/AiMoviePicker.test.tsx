import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { discoverMovies } from '@/services/tmdb/api'
import { analyzeMovieRequest } from '@/services/supabase/movieRequestAnalysis'
import { setRecommendationHistoryRemoteForTesting } from '@/services/supabase/recommendationHistory'
import type { Movie } from '@/services/tmdb/types'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/tmdb/api', () => ({
  discoverMovies: vi.fn(),
}))

vi.mock('@/services/supabase/movieRequestAnalysis', () => ({
  analyzeMovieRequest: vi.fn(),
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
    genre_ids: [35],
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

const analysis = {
  criteria: {
    mood: 'relaxed',
    occasion: 'date',
    pace: 'immersive',
    era: 'recent',
  },
  provider: 'deepseek' as const,
  model: 'deepseek-v4-flash',
}

function authenticate() {
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
  setRecommendationHistoryRemoteForTesting({
    listLatest: vi.fn(),
    deleteRun: vi.fn(),
    createRun: vi.fn().mockResolvedValue(undefined),
  })
}

async function renderPicker() {
  const [{ AiMoviePicker }, { default: i18n }] = await Promise.all([
    import('@/components/features/ai-picker/AiMoviePicker'),
    import('@/i18n/config'),
  ])
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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
  it('asks signed-out users to sign in before DeepSeek analysis', async () => {
    await renderPicker()

    expect(
      screen.getByText('請先登入，才能使用 DeepSeek 分析觀影需求。'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '分析需求並找電影' }),
    ).toBeDisabled()
  }, 15000)

  it('runs DeepSeek analysis before querying TMDB and displays the movies', async () => {
    authenticate()
    const user = userEvent.setup()
    const createRun = vi.fn().mockResolvedValue(undefined)
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn(),
      deleteRun: vi.fn(),
      createRun,
    })
    vi.mocked(analyzeMovieRequest).mockResolvedValue(analysis)
    vi.mocked(discoverMovies).mockResolvedValue({
      page: 1,
      results: Array.from({ length: 6 }, (_, index) =>
        movie(index + 1, `AI First Movie ${index + 1}`),
      ),
      total_pages: 1,
      total_results: 6,
    })

    await renderPicker()
    await user.type(
      screen.getByLabelText('觀影需求'),
      '今天很累，想和另一半看溫暖的新電影',
    )
    await user.click(screen.getByRole('button', { name: '分析需求並找電影' }))

    expect(analyzeMovieRequest).toHaveBeenCalledWith(
      '今天很累，想和另一半看溫暖的新電影',
      'zh-TW',
    )
    expect(await screen.findByText('AI First Movie 1')).toBeInTheDocument()
    expect(screen.getByText('AI First Movie 5')).toBeInTheDocument()
    expect(screen.queryByText('AI First Movie 6')).not.toBeInTheDocument()
    expect(discoverMovies).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'zh-TW',
        sort_by: 'vote_average.desc',
      }),
    )
    expect(
      vi.mocked(analyzeMovieRequest).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(discoverMovies).mock.invocationCallOrder[0])
    await waitFor(() => {
      expect(createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          provider: 'deepseek',
          model: 'deepseek-v4-flash',
          candidateMovieIds: [1, 2, 3, 4, 5],
        }),
      )
    })
  }, 15000)

  it('does not query TMDB while DeepSeek analysis is still pending', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(analyzeMovieRequest).mockImplementation(
      () => new Promise(() => undefined),
    )

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '想看刺激的電影')
    await user.click(screen.getByRole('button', { name: '分析需求並找電影' }))

    expect(
      screen.getByRole('button', { name: 'AI 正在分析需求...' }),
    ).toBeDisabled()
    expect(discoverMovies).not.toHaveBeenCalled()
  }, 15000)

  it('shows a retryable error when DeepSeek analysis fails', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(analyzeMovieRequest)
      .mockRejectedValueOnce(new Error('invalid structured response'))
      .mockResolvedValueOnce(analysis)
    vi.mocked(discoverMovies).mockResolvedValue({
      page: 1,
      results: [movie(1, 'Retry Result')],
      total_pages: 1,
      total_results: 1,
    })

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '想看溫暖的電影')
    await user.click(screen.getByRole('button', { name: '分析需求並找電影' }))

    expect(
      await screen.findByText('AI 無法分析這次需求，請稍後再試。'),
    ).toBeInTheDocument()
    expect(discoverMovies).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '重新分析' }))

    expect(await screen.findByText('Retry Result')).toBeInTheDocument()
    expect(analyzeMovieRequest).toHaveBeenCalledTimes(2)
    expect(discoverMovies).toHaveBeenCalledTimes(1)
  }, 15000)

  it('shows and retries the TMDB error after criteria validation', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(analyzeMovieRequest).mockResolvedValue(analysis)
    vi.mocked(discoverMovies)
      .mockRejectedValueOnce(new Error('TMDB unavailable'))
      .mockResolvedValueOnce({
        page: 1,
        results: [movie(1, 'TMDB Retry Result')],
        total_pages: 1,
        total_results: 1,
      })

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '想看近年的電影')
    await user.click(screen.getByRole('button', { name: '分析需求並找電影' }))

    expect(
      await screen.findByText('推薦片單載入失敗，請稍後再試。'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新載入片單' }))

    expect(await screen.findByText('TMDB Retry Result')).toBeInTheDocument()
    expect(analyzeMovieRequest).toHaveBeenCalledTimes(1)
    expect(discoverMovies).toHaveBeenCalledTimes(2)
  }, 15000)

  it('validates an empty request before calling DeepSeek', async () => {
    authenticate()
    const user = userEvent.setup()

    await renderPicker()
    await user.click(screen.getByRole('button', { name: '分析需求並找電影' }))

    expect(screen.getByText('請至少輸入兩個字的觀影需求。')).toBeInTheDocument()
    expect(analyzeMovieRequest).not.toHaveBeenCalled()
    expect(discoverMovies).not.toHaveBeenCalled()
  }, 15000)
})
