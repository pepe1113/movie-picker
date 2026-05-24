import { describe, expect, it } from 'vitest'
import {
  buildMovieDetailPresentation,
  getExternalRatings,

} from '@/utils/movieDetail'
import type { OmdbMovieResponse } from '@/services/omdb/types'
import type {
  CreditsResponse,
  MovieDetail,
  VideosResponse,
} from '@/services/tmdb/types'

describe('movie detail helpers', () => {


  it('normalizes available OMDb external ratings', () => {
    const omdb: OmdbMovieResponse = {
      Response: 'True',
      imdbRating: '8.4',
      Ratings: [
        { Source: 'Internet Movie Database', Value: '8.4/10' },
        { Source: 'Rotten Tomatoes', Value: '93%' },
        { Source: 'Metacritic', Value: '82/100' },
      ],
    }

    expect(getExternalRatings(omdb)).toEqual([
      { label: 'IMDb', value: '8.4/10' },
      { label: 'Rotten Tomatoes', value: '93%' },
    ])
  })

  it('builds movie detail presentation data from raw resources', () => {
    const presentation = buildMovieDetailPresentation({
      detail: movieDetail,
      credits,
      videos,
      omdb,
    })

    expect(presentation.cast).toHaveLength(12)
    expect(presentation.trailer?.key).toBe('official-trailer')
    expect(presentation.externalRatings).toEqual([
      { label: 'IMDb', value: '8.4/10' },
      { label: 'Rotten Tomatoes', value: '93%' },
    ])
    expect(presentation.movieForWishlist).toMatchObject({
      id: 1,
      title: 'Presentation Movie',
      genre_ids: [18, 53],
      vote_average: 8.4,
    })
  })
})

const movieDetail: MovieDetail = {
  adult: false,
  backdrop_path: '/backdrop.jpg',
  belongs_to_collection: null,
  budget: 10,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  homepage: '',
  id: 1,
  imdb_id: 'tt0000001',
  original_language: 'en',
  original_title: 'Presentation Movie',
  overview: 'A detail page movie.',
  popularity: 40,
  poster_path: '/poster.jpg',
  production_companies: [],
  production_countries: [],
  release_date: '2026-01-01',
  revenue: 20,
  runtime: 120,
  spoken_languages: [],
  status: 'Released',
  tagline: '',
  title: 'Presentation Movie',
  video: false,
  vote_average: 8.4,
  vote_count: 500,
}

const credits: CreditsResponse = {
  id: 1,
  cast: Array.from({ length: 14 }, (_, index) => ({
    adult: false,
    gender: null,
    id: index + 1,
    known_for_department: 'Acting',
    name: `Actor ${index + 1}`,
    original_name: `Actor ${index + 1}`,
    popularity: 10,
    profile_path: null,
    cast_id: index + 1,
    character: `Character ${index + 1}`,
    credit_id: `credit-${index + 1}`,
    order: index,
  })),
  crew: [],
}

const videos: VideosResponse = {
  id: 1,
  results: [
    {
      id: 'teaser',
      iso_639_1: 'en',
      iso_3166_1: 'US',
      key: 'teaser-key',
      name: 'Teaser',
      official: true,
      published_at: '2026-01-01',
      site: 'YouTube',
      size: 1080,
      type: 'Teaser',
    },
    {
      id: 'trailer',
      iso_639_1: 'en',
      iso_3166_1: 'US',
      key: 'official-trailer',
      name: 'Official Trailer',
      official: true,
      published_at: '2026-01-02',
      site: 'YouTube',
      size: 1080,
      type: 'Trailer',
    },
  ],
}

const omdb: OmdbMovieResponse = {
  Response: 'True',
  imdbRating: '8.4',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.4/10' },
    { Source: 'Rotten Tomatoes', Value: '93%' },
  ],
}
