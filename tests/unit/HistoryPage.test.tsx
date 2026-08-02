import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Movie, TvShow } from '@/services/tmdb/types'
import {
  setRecommendationHistoryRemoteForTesting,
  type RecommendationRun,
} from '@/services/supabase/recommendationHistory'
import { useAuthStore } from '@/stores/authStore'
import i18n from '@/i18n/config'
import { Component as HistoryPage } from '@/pages/History'

function movie(id: number, title = `Movie ${id}`): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [35],
    id,
    media_type: 'movie',
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

function tv(id: number, name = `Show ${id}`): TvShow {
  return {
    adult: false,
    backdrop_path: null,
    first_air_date: '2026-01-01',
    genre_ids: [35],
    id,
    media_type: 'tv',
    name,
    origin_country: ['JP'],
    original_language: 'ja',
    original_name: name,
    overview: `TV Overview ${id}`,
    popularity: 10,
    poster_path: null,
    vote_average: 8,
    vote_count: 100,
  }
}

function run(overrides: Partial<RecommendationRun> = {}): RecommendationRun {
  return {
    id: 'run-1',
    media_type: 'movie',
    intent: {
      summary: '今晚以輕鬆且好理解的作品為主',
      hard_constraints: { exclude_genre_ids: [27] },
      soft_preferences: { qualities: ['輕鬆'] },
      display_labels: {
        hard: ['不要恐怖片'],
        soft: ['輕鬆'],
      },
    },
    discover_plan: {
      include_genre_ids: [35],
      exclude_genre_ids: [27],
    },
    recommendations: [
      {
        media_id: 1,
        reason: '喜劇類型適合現在轉換心情。',
        kind: 'primary',
        media_snapshot: movie(1, 'History Pick'),
      },
    ],
    provider: 'openai',
    model: 'gpt-4o-mini',
    created_at: '2026-07-27T12:00:00Z',
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

async function renderHistoryPage() {
  await i18n.changeLanguage('zh-TW')
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
          <HistoryPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

describe('History page', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    setRecommendationHistoryRemoteForTesting(null)
  })

  it('shows a sign-in prompt when unauthenticated', async () => {
    await renderHistoryPage()
    expect(screen.getByText('登入查看推薦紀錄')).toBeInTheDocument()
  })

  it('renders the new intent, labels, model, snapshot, and reason', async () => {
    authenticate()
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([run()]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()

    expect(
      await screen.findByText('今晚以輕鬆且好理解的作品為主'),
    ).toBeInTheDocument()
    expect(screen.getByText('不要恐怖片')).toBeInTheDocument()
    expect(screen.getByText('輕鬆')).toBeInTheDocument()
    expect(screen.getByText('AI 模型：gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('History Pick')).toBeInTheDocument()
    expect(screen.getByText('喜劇類型適合現在轉換心情。')).toBeInTheDocument()
  })

  it('shows the saved overview when fallback has no reason', async () => {
    authenticate()
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([
        run({
          recommendations: [
            {
              media_id: 2,
              kind: 'primary',
              media_snapshot: movie(2, 'Fallback History Pick'),
            },
          ],
        }),
      ]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()
    expect(await screen.findByText('Fallback History Pick')).toBeInTheDocument()
    expect(screen.getAllByText('Overview 2')).toHaveLength(2)
  })

  it('keeps colliding movie and TV ids distinct and links each detail route', async () => {
    authenticate()
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([
        run({
          id: 'movie-run',
          recommendations: [
            {
              media_id: 1,
              kind: 'primary',
              media_snapshot: movie(1, 'Same ID Movie'),
            },
          ],
        }),
        run({
          id: 'tv-run',
          media_type: 'tv',
          recommendations: [
            {
              media_id: 1,
              kind: 'primary',
              media_snapshot: tv(1, 'Same ID Show'),
            },
          ],
        }),
      ]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()

    expect(
      (await screen.findByText('Same ID Movie')).closest('a'),
    ).toHaveAttribute('href', '/movie/1')
    expect(screen.getByText('Same ID Show').closest('a')).toHaveAttribute(
      'href',
      '/tv/1',
    )
  })

  it('skips legacy recommendations without a media snapshot', async () => {
    authenticate()
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([
        run({
          recommendations: [
            {
              media_id: 99,
              kind: 'primary',
            } as RecommendationRun['recommendations'][number],
            {
              media_id: 1,
              kind: 'primary',
              media_snapshot: movie(1, 'Current History Pick'),
            },
          ],
        }),
      ]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()
    expect(await screen.findByText('Current History Pick')).toBeInTheDocument()
  })

  it('deletes one recommendation run after confirmation', async () => {
    const user = userEvent.setup()
    const deleteRun = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    authenticate()
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([run()]),
      deleteRun,
    })

    await renderHistoryPage()
    await user.click(await screen.findByRole('button', { name: '刪除紀錄' }))

    await waitFor(() => {
      expect(deleteRun).toHaveBeenCalledWith('user-id', 'run-1')
      expect(screen.queryByText('History Pick')).not.toBeInTheDocument()
    })
  })
})
