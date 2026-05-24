import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import {
  setRecommendationHistoryRemoteForTesting,
  type RecommendationRun,
} from '@/services/supabase/recommendationHistory'
import { useAuthStore } from '@/stores/authStore'
import i18n from '@/i18n/config'

function movie(id: number, title = `Movie ${id}`): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [28],
    id,
    original_language: 'en',
    original_title: title,
    overview: '',
    popularity: 10,
    poster_path: null,
    release_date: '2026-01-01',
    title,
    video: false,
    vote_average: 8,
    vote_count: 100,
  }
}

function run(overrides: Partial<RecommendationRun> = {}): RecommendationRun {
  return {
    id: 'run-1',
    answers: { mood: 'exciting' },
    recommendations: [
      {
        movie_id: 1,
        reason: '節奏很適合今晚',
        movie_snapshot: movie(1, 'Speed Night'),
      },
    ],
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    created_at: '2026-05-24T12:00:00Z',
    ...overrides,
  }
}

async function renderHistoryPage() {
  const [{ Component }] = await Promise.all([import('@/pages/History')])
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
          <Component />
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
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

  it('shows an empty state for authenticated users with no runs', async () => {
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()

    expect(await screen.findByText('還沒有推薦紀錄')).toBeInTheDocument()
  })

  it('renders saved recommendation runs without fetching TMDB', async () => {
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([run()]),
      deleteRun: vi.fn(),
    })

    await renderHistoryPage()

    expect(await screen.findByText('Speed Night')).toBeInTheDocument()
    expect(screen.getByText('節奏很適合今晚')).toBeInTheDocument()
    expect(screen.getByText('deepseek / deepseek-v4-flash')).toBeInTheDocument()
  })

  it('deletes one recommendation run after confirmation', async () => {
    const user = userEvent.setup()
    const deleteRun = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([run()]),
      deleteRun,
    })

    await renderHistoryPage()
    await user.click(await screen.findByRole('button', { name: '刪除紀錄' }))

    await waitFor(() => {
      expect(deleteRun).toHaveBeenCalledWith('user-id', 'run-1')
      expect(screen.queryByText('Speed Night')).not.toBeInTheDocument()
    })
  })

  it('preserves the run when delete fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setRecommendationHistoryRemoteForTesting({
      listLatest: vi.fn().mockResolvedValue([run()]),
      deleteRun: vi.fn().mockRejectedValue(new Error('delete failed')),
    })

    await renderHistoryPage()
    await user.click(await screen.findByRole('button', { name: '刪除紀錄' }))

    expect(await screen.findByText('Speed Night')).toBeInTheDocument()
  })
})
