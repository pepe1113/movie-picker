import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '@/services/tmdb/types'

const get = vi.hoisted(() => vi.fn())
vi.mock('axios', () => ({ default: { create: () => ({ get }) } }))

const { flattenMultiSearchResults, getPersonCredits } =
  await import('@/services/tmdb/api')

const media = (id: number, popularity: number, media_type = 'movie') =>
  ({ id, media_type, popularity, title: `T${id}` }) as unknown as MediaItem

describe('flattenMultiSearchResults', () => {
  it('expands people into their known-for titles without duplicates', () => {
    const results = flattenMultiSearchResults([
      media(1, 1),
      { id: 99, media_type: 'person', known_for: [media(1, 1), media(2, 1)] },
      { id: 100, media_type: 'person' },
    ])

    expect(results.map(({ id }) => id)).toEqual([1, 2])
  })
})

describe('getPersonCredits', () => {
  beforeEach(() => get.mockReset())

  it('merges cast and crew, dedupes and sorts by popularity', async () => {
    get.mockResolvedValue({
      data: {
        id: 7,
        cast: [media(1, 5), media(2, 50, 'tv'), media(1, 5)],
        crew: [media(3, 20), media(2, 50, 'tv'), media(2, 9)],
      },
    })

    const result = await getPersonCredits(7, 'zh-TW')

    expect(get).toHaveBeenCalledWith('/person/7/combined_credits', {
      params: { language: 'zh-TW' },
    })
    expect(
      result.results.map((item) => `${item.media_type}-${item.id}`),
    ).toEqual(['tv-2', 'movie-3', 'movie-2', 'movie-1'])
    expect(result.total_pages).toBe(1)
  })
})
