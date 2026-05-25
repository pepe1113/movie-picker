import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MovieCard } from '@/components/features/movie/MovieCard'
import type { Movie } from '@/services/tmdb/types'
import i18n from '@/i18n/config'

const getMovieVideos = vi.fn()

vi.mock('@/services/tmdb/api', () => ({
  getMovieVideos: (...args: unknown[]) => getMovieVideos(...args),
}))

const movie: Movie = {
  adult: false,
  backdrop_path: null,
  genre_ids: [28],
  id: 42,
  original_language: 'en',
  original_title: 'Hover Movie',
  overview: 'A movie overview.',
  popularity: 10,
  poster_path: null,
  release_date: '2026-01-01',
  title: 'Hover Movie',
  video: false,
  vote_average: 8,
  vote_count: 100,
}

function renderMovieCard(enableTrailerPreview = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MovieCard movie={movie} enableTrailerPreview={enableTrailerPreview} />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

describe('MovieCard', () => {
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
        matches: true,
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

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('does not load trailer previews unless explicitly enabled', () => {
    vi.useFakeTimers()
    renderMovieCard()

    act(() => {
      fireEvent.mouseEnter(screen.getByText('Hover Movie').closest('.group')!)
      vi.advanceTimersByTime(500)
    })

    expect(getMovieVideos).not.toHaveBeenCalled()
  })

  it('loads trailer previews on desktop hover when enabled', async () => {
    vi.useFakeTimers()
    getMovieVideos.mockResolvedValue({ results: [] })
    renderMovieCard(true)

    act(() => {
      fireEvent.mouseEnter(screen.getByText('Hover Movie').closest('.group')!)
      vi.advanceTimersByTime(500)
    })

    expect(getMovieVideos).toHaveBeenCalledWith(42, 'zh-TW')
  })
})
