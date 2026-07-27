import { describe, expect, it } from 'vitest'
import {
  getNextVisibleCount,
  shouldFetchNextMoviePage,
} from '@/utils/movieListBrowsing'

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
})
