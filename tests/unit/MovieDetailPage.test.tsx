import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Component as MovieDetailPage } from '@/pages/MovieDetailPage'
import type {
  CreditsResponse,
  MovieDetail,
  MovieImagesResponse,
  VideosResponse,
} from '@/services/tmdb/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options?.region ? `${key}:${options.region}` : key,
  }),
}))

vi.mock('@/components/features/wishlist/WishlistButton', () => ({
  WishlistButton: () => <button type="button">Wishlist</button>,
}))

vi.mock('@/hooks/useMovieDetail', () => ({
  useMovieDetail: () => ({
    detail: movieDetail,
    credits,
    videos,
    images,
    omdb: undefined,
    isLoading: false,
    isError: false,
  }),
}))

describe('MovieDetailPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses a visible gradient when no backdrop image is shown', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/movie/1']}>
        <Routes>
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const heroBackground = container.querySelector('section > div.absolute')

    expect(heroBackground).toHaveClass(
      'bg-[radial-gradient(circle_at_20%_20%,rgb(30_215_96/0.22),transparent_32%),linear-gradient(135deg,var(--background)_0%,var(--muted)_48%,var(--background)_100%)]',
    )
  })

  it('renders regional posters as an infinite carousel with controls and dots', () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter initialEntries={['/movie/1']}>
        <Routes>
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const carousel = screen.getByRole('region', {
      name: 'movieDetail.sections.regionalPosters',
    })

    expect(
      screen.getByTestId('regional-poster-active-label'),
    ).toHaveTextContent('movieDetail.regionalPosters.korea')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'movieDetail.regionalPosters.controls.next',
      }),
    )
    expect(screen.getByTestId('regional-posters-carousel')).toHaveAttribute(
      'data-slide-direction',
      'left',
    )
    expect(
      screen.getByTestId('regional-poster-active-label'),
    ).toHaveTextContent('movieDetail.regionalPosters.japan')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'movieDetail.regionalPosters.controls.previous',
      }),
    )
    expect(screen.getByTestId('regional-posters-carousel')).toHaveAttribute(
      'data-slide-direction',
      'right',
    )
    expect(
      screen.getByTestId('regional-poster-active-label'),
    ).toHaveTextContent('movieDetail.regionalPosters.korea')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'movieDetail.regionalPosters.controls.showPoster:movieDetail.regionalPosters.taiwan',
      }),
    )
    expect(
      screen.getByTestId('regional-poster-active-label'),
    ).toHaveTextContent('movieDetail.regionalPosters.taiwan')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByTestId('regional-posters-carousel')).toHaveAttribute(
      'data-slide-direction',
      'left',
    )
    expect(
      screen.getByTestId('regional-poster-active-label'),
    ).toHaveTextContent('movieDetail.regionalPosters.korea')
    expect(carousel).toBeInTheDocument()
  })
})

const movieDetail: MovieDetail = {
  adult: false,
  backdrop_path: null,
  belongs_to_collection: null,
  budget: 0,
  genres: [{ id: 18, name: 'Drama' }],
  homepage: '',
  id: 1,
  imdb_id: 'tt0000001',
  original_language: 'en',
  original_title: 'Gradient Movie',
  overview: 'A movie page with a visible fallback gradient.',
  popularity: 10,
  poster_path: null,
  production_companies: [],
  production_countries: [],
  release_date: '2026-01-01',
  revenue: 0,
  runtime: 120,
  spoken_languages: [],
  status: 'Released',
  tagline: '',
  title: 'Gradient Movie',
  video: false,
  vote_average: 8,
  vote_count: 100,
}

const credits: CreditsResponse = {
  id: 1,
  cast: [],
  crew: [],
}

const videos: VideosResponse = {
  id: 1,
  results: [],
}

const images: MovieImagesResponse = {
  id: 1,
  posters: [
    createPoster('/korea.jpg', 'ko', 8.4, 100),
    createPoster('/japan.jpg', 'ja', 8.3, 95),
    createPoster('/us.jpg', 'en', 8.2, 90),
    createPoster('/taiwan.jpg', 'zh', 8.1, 85),
  ],
  backdrops: [],
}

function createPoster(
  filePath: string,
  language: string,
  voteAverage: number,
  voteCount: number,
) {
  return {
    aspect_ratio: 0.667,
    file_path: filePath,
    height: 3000,
    iso_639_1: language,
    vote_average: voteAverage,
    vote_count: voteCount,
    width: 2000,
  }
}
