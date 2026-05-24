import { describe, expect, it } from 'vitest'
import {
  getNextVisibleCount,
  shouldFetchNextMoviePage,
  toTop100Movies,
} from '@/utils/movieListBrowsing'
import type { Movie } from '@/services/tmdb/types'

describe('movie list browsing', () => {
  it('increases visible count by the section increment', () => {
    expect(getNextVisibleCount(8, 8)).toBe(16)
  })

  it('fetches the next page when the next visible count reaches loaded movies', () => {
    expect(
      shouldFetchNextMoviePage({
        visibleCount: 8,
        increment: 8,
        loadedCount: 16,
        hasNextPage: true,
      }),
    ).toBe(true)
  })

  it('does not fetch when there is no next page', () => {
    expect(
      shouldFetchNextMoviePage({
        visibleCount: 8,
        increment: 8,
        loadedCount: 16,
        hasNextPage: false,
      }),
    ).toBe(false)
  })

  it('caps Top 100 movies at 100 results', () => {
    const movies = Array.from({ length: 120 }, (_, index) => ({
      id: index + 1,
    })) as Movie[]

    expect(toTop100Movies(movies)).toHaveLength(100)
    expect(toTop100Movies(movies).at(-1)?.id).toBe(100)
  })
})
