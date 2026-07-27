import { describe, expect, it } from 'vitest'
import type { Movie, TvShow } from '@/services/tmdb/types'
import {
  getMediaDate,
  getMediaDetailPath,
  getMediaKey,
  getMediaTitle,
  getMediaType,
} from '@/utils/media'

const movie: Movie = {
  adult: false,
  backdrop_path: null,
  genre_ids: [18],
  id: 42,
  original_language: 'en',
  original_title: 'Movie title',
  overview: '',
  popularity: 10,
  poster_path: null,
  release_date: '2026-01-02',
  title: 'Movie title',
  video: false,
  vote_average: 8,
  vote_count: 100,
}

const tvShow: TvShow = {
  adult: false,
  backdrop_path: null,
  first_air_date: '2025-04-03',
  genre_ids: [18],
  id: 42,
  media_type: 'tv',
  name: 'TV title',
  origin_country: ['TW'],
  original_language: 'zh',
  original_name: 'TV title',
  overview: '',
  popularity: 10,
  poster_path: null,
  vote_average: 8,
  vote_count: 100,
}

describe('media helpers', () => {
  it('normalizes legacy movies and TV shows through one public interface', () => {
    expect(getMediaType(movie)).toBe('movie')
    expect(getMediaTitle(movie)).toBe('Movie title')
    expect(getMediaDate(movie)).toBe('2026-01-02')
    expect(getMediaDetailPath(movie)).toBe('/movie/42')
    expect(getMediaKey(movie)).toBe('movie:42')

    expect(getMediaType(tvShow)).toBe('tv')
    expect(getMediaTitle(tvShow)).toBe('TV title')
    expect(getMediaDate(tvShow)).toBe('2025-04-03')
    expect(getMediaDetailPath(tvShow)).toBe('/tv/42')
    expect(getMediaKey(tvShow)).toBe('tv:42')
  })
})
