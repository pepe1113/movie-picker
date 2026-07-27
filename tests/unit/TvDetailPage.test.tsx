import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Component as MediaDetailPage } from '@/pages/MovieDetailPage'
import type {
  TvAggregateCreditsResponse,
  TvDetail,
  VideosResponse,
} from '@/services/tmdb/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options?.count ? `${key}:${options.count}` : key,
  }),
}))

vi.mock('@/components/features/wishlist/WishlistButton', () => ({
  WishlistButton: () => <button type="button">Wishlist</button>,
}))

vi.mock('@/hooks/useMovieDetail', () => ({
  useMovieDetail: () => ({
    detail: tvDetail,
    credits,
    videos,
    omdb: null,
    isLoading: false,
    isError: false,
  }),
}))

describe('TV detail page', () => {
  it('shows season, episode, and next-airing information from TMDB', () => {
    render(
      <MemoryRouter initialEntries={['/tv/1']}>
        <Routes>
          <Route path="/tv/:id" element={<MediaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Series title' }),
    ).toBeInTheDocument()
    expect(screen.getByText('tvDetail.seasons:3')).toBeInTheDocument()
    expect(screen.getByText('tvDetail.episodes:24')).toBeInTheDocument()
    expect(screen.getByText('2026-08-08')).toBeInTheDocument()
  })
})

const tvDetail: TvDetail = {
  adult: false,
  backdrop_path: null,
  created_by: [],
  episode_run_time: [45],
  first_air_date: '2025-01-01',
  genres: [{ id: 18, name: 'Drama' }],
  homepage: '',
  id: 1,
  in_production: true,
  last_air_date: '2026-08-01',
  name: 'Series title',
  networks: [],
  next_episode_to_air: {
    id: 99,
    name: 'Next episode',
    air_date: '2026-08-08',
    episode_number: 8,
    runtime: 45,
    season_number: 3,
    still_path: null,
  },
  number_of_episodes: 24,
  number_of_seasons: 3,
  origin_country: ['TW'],
  original_language: 'zh',
  original_name: 'Series title',
  overview: 'Series overview',
  popularity: 20,
  poster_path: null,
  production_companies: [],
  production_countries: [],
  spoken_languages: [],
  status: 'Returning Series',
  tagline: '',
  type: 'Scripted',
  vote_average: 8.2,
  vote_count: 100,
}

const credits: TvAggregateCreditsResponse = {
  id: 1,
  cast: [],
  crew: [],
}

const videos: VideosResponse = {
  id: 1,
  results: [],
}
