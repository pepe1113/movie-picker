import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Component as MovieDetailPage } from '@/pages/MovieDetailPage'
import type {
  CreditsResponse,
  MovieDetail,
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
    omdb,
    isLoading: false,
    isError: false,
  }),
}))

describe('MovieDetailPage', () => {
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
      'bg-[radial-gradient(circle_at_20%_20%,rgb(214_43_66/0.24),transparent_32%),linear-gradient(135deg,var(--background)_0%,var(--muted)_48%,var(--background)_100%)]',
    )
  })

  it('does not render the removed regional poster carousel', () => {
    render(
      <MemoryRouter initialEntries={['/movie/1']}>
        <Routes>
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.queryByTestId('regional-posters-carousel'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Gradient Movie' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'movieDetail.sections.info' }),
    ).toBeInTheDocument()
  })

  it('renders prominent branded rating pills', () => {
    render(
      <MemoryRouter initialEntries={['/movie/1']}>
        <Routes>
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('TMDB logo')).toBeInTheDocument()
    expect(screen.getByText('8.0')).toBeInTheDocument()
    expect(screen.getByText('(100)')).toBeInTheDocument()
    expect(screen.getByLabelText('IMDb logo')).toBeInTheDocument()
    expect(screen.getByText('7.8/10')).toBeInTheDocument()
    expect(screen.getByLabelText('Rotten Tomatoes logo')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
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

const omdb = {
  Response: 'True' as const,
  Ratings: [
    { Source: 'Internet Movie Database', Value: '7.8/10' },
    { Source: 'Rotten Tomatoes', Value: '91%' },
  ],
}
