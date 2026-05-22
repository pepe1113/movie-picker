import { describe, expect, it } from 'vitest'
import {
  getExternalRatings,
  getRegionalPosters,
} from '@/utils/movieDetail'
import type { MovieImagesResponse } from '@/services/tmdb/types'
import type { OmdbMovieResponse } from '@/services/omdb/types'

describe('movie detail helpers', () => {
  it('returns only available regional posters in the default order', () => {
    const images: MovieImagesResponse = {
      id: 1,
      posters: [
        poster('/us.jpg', 'en'),
        poster('/jp.jpg', 'ja'),
        poster('/kr.jpg', 'ko'),
        poster('/fr.jpg', 'fr'),
      ],
      backdrops: [],
    }

    expect(getRegionalPosters(images)).toEqual([
      expect.objectContaining({ region: 'KR', file_path: '/kr.jpg' }),
      expect.objectContaining({ region: 'JP', file_path: '/jp.jpg' }),
      expect.objectContaining({ region: 'US', file_path: '/us.jpg' }),
    ])
  })

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
})

function poster(file_path: string, iso_639_1: string) {
  return {
    aspect_ratio: 0.667,
    height: 1500,
    iso_639_1,
    file_path,
    vote_average: 5,
    vote_count: 1,
    width: 1000,
  }
}
