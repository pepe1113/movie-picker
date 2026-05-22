import { describe, expect, it } from 'vitest'
import {
  getExternalRatings,

} from '@/utils/movieDetail'
import type { OmdbMovieResponse } from '@/services/omdb/types'

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
})

