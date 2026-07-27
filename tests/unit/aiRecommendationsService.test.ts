import { describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from '@/services/supabase/client'
import {
  RECOMMENDATION_DEADLINE_MS,
  requestContextRecommendations,
} from '@/services/supabase/aiRecommendations'

vi.mock('@/services/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}))

function movie(id: number): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [35],
    id,
    original_language: 'en',
    original_title: `Movie ${id}`,
    overview: `Overview ${id}`,
    popularity: 10,
    poster_path: null,
    release_date: '2026-01-01',
    title: `Movie ${id}`,
    video: false,
    vote_average: 8,
    vote_count: 100,
  }
}

function response() {
  return {
    direction: {
      summary: '今晚以輕鬆且好理解的作品為主',
      labels: [
        { text: '不要恐怖片', kind: 'hard' as const },
        { text: '輕鬆', kind: 'soft' as const },
      ],
    },
    recommendations: [
      {
        movie_id: 2,
        reason: '喜劇類型適合現在轉換心情。',
        kind: 'primary' as const,
        movie_snapshot: movie(2),
      },
      {
        movie_id: 1,
        reason: '高評分作品，保留一點新鮮感。',
        kind: 'wildcard' as const,
        movie_snapshot: movie(1),
      },
    ],
    provider: 'openrouter' as const,
    model: 'inclusionai/ling-3.0-flash:free',
    used_fallback: false,
  }
}

describe('context recommendation Supabase service', () => {
  it('calls one coordinator endpoint with the raw request, locale, and deadline', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: response(), error: null })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)
    const controller = new AbortController()

    const result = await requestContextRecommendations(
      '  剛失戀，但不要愛情片。 ',
      'zh-TW',
      controller.signal,
    )

    expect(invoke).toHaveBeenCalledWith('recommend-movies', {
      body: { request: '剛失戀，但不要愛情片。', locale: 'zh-TW' },
      signal: controller.signal,
      timeout: RECOMMENDATION_DEADLINE_MS,
    })
    expect(result.recommendations.map((item) => item.movie_id)).toEqual([2, 1])
  })

  it('accepts an empty result and fallback items without fake reasons', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ...response(),
        recommendations: [
          {
            movie_id: 1,
            kind: 'primary',
            movie_snapshot: movie(1),
          },
        ],
        used_fallback: true,
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    const result = await requestContextRecommendations('想看輕鬆電影', 'zh-TW')
    expect(result.used_fallback).toBe(true)
    expect(result.recommendations[0]?.reason).toBeUndefined()
  })

  it('rejects malformed coordinator responses', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { ...response(), provider: 'unexpected-provider' },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await expect(
      requestContextRecommendations('想看輕鬆電影', 'zh-TW'),
    ).rejects.toThrow('AI recommendation response has an invalid structure')
  })

  it('surfaces coordinator request errors', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'deadline exceeded' },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await expect(
      requestContextRecommendations('想看輕鬆電影', 'zh-TW'),
    ).rejects.toThrow('deadline exceeded')
  })
})
