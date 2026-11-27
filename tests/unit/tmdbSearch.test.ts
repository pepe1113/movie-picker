import { describe, expect, it } from 'vitest'
import { flattenMultiSearchResults } from '@/services/tmdb/api'
import type { MediaItem } from '@/services/tmdb/types'

const movie = (id: number) =>
  ({ id, media_type: 'movie', title: `Movie ${id}` }) as unknown as MediaItem

describe('flattenMultiSearchResults', () => {
  it('expands people into their known-for titles without duplicates', () => {
    const results = flattenMultiSearchResults([
      movie(1),
      {
        id: 99,
        media_type: 'person',
        known_for: [movie(1), movie(2)],
      },
      { id: 100, media_type: 'person' },
    ])

    expect(results.map(({ id }) => id)).toEqual([1, 2])
  })
})
