import { describe, expect, it } from 'vitest'
import {
  getNextVisibleCount,
  selectInfiniteMedia,
  shouldFetchNextMoviePage,
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

  it('flattens infinite-query media pages once', () => {
    const first = { id: 1 } as Movie
    const second = { id: 2 } as Movie

    expect(
      selectInfiniteMedia({
        pages: [
          { page: 1, results: [first], total_pages: 2, total_results: 2 },
          { page: 2, results: [second], total_pages: 2, total_results: 2 },
        ],
        pageParams: [1, 2],
      }),
    ).toEqual({ media: [first, second] })
  })
})
