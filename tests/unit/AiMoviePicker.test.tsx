import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import { requestContextRecommendations } from '@/services/supabase/aiRecommendations'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/supabase/aiRecommendations', () => ({
  MAX_MOVIE_REQUEST_LENGTH: 500,
  RECOMMENDATION_DEADLINE_MS: 10_000,
  requestContextRecommendations: vi.fn(),
}))

vi.mock('@/components/features/ai-picker/AiRecommendationCarousel', () => ({
  AiRecommendationCarousel: ({
    recommendations,
    shouldShowOverviewReasons,
  }: {
    recommendations: Array<{ movie: Movie; reason?: string }>
    shouldShowOverviewReasons: boolean
  }) => (
    <div>
      {recommendations.map((item) => (
        <article key={item.movie.id}>
          <h3>{item.movie.title}</h3>
          <p>
            {item.reason ??
              (shouldShowOverviewReasons ? item.movie.overview : '')}
          </p>
        </article>
      ))}
    </div>
  ),
}))

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => 'zh-TW'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  })
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

function result(
  overrides: Partial<{
    recommendations: Array<{
      movie_id: number
      reason?: string
      kind: 'primary' | 'wildcard'
      movie_snapshot: Movie
    }>
    used_fallback: boolean
  }> = {},
) {
  return {
    direction: {
      summary: '今晚以輕鬆、好理解的作品轉換心情',
      labels: [
        { text: '不要恐怖片', kind: 'hard' as const },
        { text: '輕鬆', kind: 'soft' as const },
      ],
    },
    recommendations: [
      {
        movie_id: 1,
        reason: '喜劇類型適合現在轉換心情。',
        kind: 'primary' as const,
        movie_snapshot: movie(1, 'Context Pick'),
      },
    ],
    provider: 'openrouter' as const,
    model: 'inclusionai/ling-3.0-flash:free',
    used_fallback: false,
    ...overrides,
  }
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
}

async function renderPicker() {
  const [{ AiMoviePicker }, { default: i18n }] = await Promise.all([
    import('@/components/features/ai-picker/AiMoviePicker'),
    import('@/i18n/config'),
  ])
  await i18n.changeLanguage('zh-TW')
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
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
  it('keeps the AI picker behind sign-in', async () => {
    await renderPicker()

    expect(screen.getByText('請先登入，才能使用 AI 選片。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '幫我選片' })).toBeDisabled()
  })

  it('uses one coordinator request and reveals only the complete result', async () => {
    authenticate()
    const user = userEvent.setup()
    let resolveRequest: (value: ReturnType<typeof result>) => void = () =>
      undefined
    vi.mocked(requestContextRecommendations).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    await renderPicker()
    await user.type(
      screen.getByLabelText('觀影需求'),
      '很無聊，想刺激一點但不要恐怖片。',
    )
    await user.click(screen.getByRole('button', { name: '幫我選片' }))

    expect(requestContextRecommendations).toHaveBeenCalledWith(
      '很無聊，想刺激一點但不要恐怖片。',
      'zh-TW',
      expect.any(AbortSignal),
    )
    expect(screen.queryByText('Context Pick')).not.toBeInTheDocument()

    await act(async () => resolveRequest(result()))

    expect(
      await screen.findByText('今晚以輕鬆、好理解的作品轉換心情'),
    ).toBeInTheDocument()
    expect(screen.getByText('不要恐怖片')).toBeInTheDocument()
    expect(screen.getByText('Context Pick')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('keeps animated waiting progress at or below ninety percent', async () => {
    vi.useFakeTimers()
    authenticate()
    vi.mocked(requestContextRecommendations).mockImplementation(
      () => new Promise(() => undefined),
    )

    await renderPicker()
    fireEvent.change(screen.getByLabelText('觀影需求'), {
      target: { value: '想看輕鬆的電影' },
    })
    fireEvent.click(screen.getByRole('button', { name: '幫我選片' }))

    await act(async () => vi.advanceTimersByTime(9_900))
    expect(
      Number(screen.getByRole('progressbar').getAttribute('aria-valuenow')),
    ).toBeLessThanOrEqual(90)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows a retryable error without automatically retrying', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(requestContextRecommendations)
      .mockRejectedValueOnce(new Error('planning failed'))
      .mockResolvedValueOnce(result())

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '心情不好，想轉換心情。')
    await user.click(screen.getByRole('button', { name: '幫我選片' }))

    expect(
      await screen.findByText('這次無法完成選片，請再試一次。'),
    ).toBeInTheDocument()
    expect(requestContextRecommendations).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '重新選片' }))
    expect(await screen.findByText('Context Pick')).toBeInTheDocument()
    expect(requestContextRecommendations).toHaveBeenCalledTimes(2)
  })

  it('shows an adjustable empty state instead of filling the list', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(requestContextRecommendations).mockResolvedValue(
      result({ recommendations: [] }),
    )

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '只想看非常特定的電影')
    await user.click(screen.getByRole('button', { name: '幫我選片' }))

    expect(
      await screen.findByText(
        '找不到符合所有明確限制的電影，請調整描述後再試。',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '調整觀影需求' }))
    expect(screen.getByLabelText('觀影需求')).toBeInTheDocument()
  })

  it('uses movie overview for a fallback without a fake reason', async () => {
    authenticate()
    const user = userEvent.setup()
    vi.mocked(requestContextRecommendations).mockResolvedValue(
      result({
        recommendations: [
          {
            movie_id: 2,
            kind: 'primary',
            movie_snapshot: movie(2, 'Fallback Pick'),
          },
        ],
        used_fallback: true,
      }),
    )

    await renderPicker()
    await user.type(screen.getByLabelText('觀影需求'), '想看近年的日語療癒電影')
    await user.click(screen.getByRole('button', { name: '幫我選片' }))

    expect(await screen.findByText('Fallback Pick')).toBeInTheDocument()
    expect(screen.getByText('Overview 2')).toBeInTheDocument()
  })
})
