import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MovieCard } from '@/components/features/movie/MovieCard'
import type { Movie, TvShow } from '@/services/tmdb/types'
import i18n from '@/i18n/config'

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

const tvShow: TvShow = {
  adult: false,
  backdrop_path: null,
  first_air_date: '2025-03-02',
  genre_ids: [18],
  id: 42,
  media_type: 'tv',
  name: 'Hover Series',
  origin_country: ['TW'],
  original_language: 'zh',
  original_name: 'Hover Series',
  overview: 'A TV overview.',
  popularity: 10,
  poster_path: null,
  vote_average: 8,
  vote_count: 100,
}

function renderCard(media: Movie | TvShow) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <MovieCard movie={media} />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('MovieCard', () => {
  it('uses the shared media title, date, and detail route', () => {
    renderCard(tvShow)

    expect(screen.getByText('Hover Series')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tv/42')
  })

  it('uses one poster flip animation and never renders a trailer iframe', () => {
    const { container } = renderCard(movie)

    expect(container.querySelector('.poster-card-flip')).toBeInTheDocument()
    expect(container.querySelector('iframe')).not.toBeInTheDocument()
  })
})
