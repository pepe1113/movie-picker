import { describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from '@/services/supabase/client'
import {
  RECOMMENDATION_DEADLINE_MS,
  RecommendationRequestError,
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
    media_type: 'movie',
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
    media_type: 'movie' as const,
    direction: {
      summary: '今晚以輕鬆且好理解的作品為主',
      labels: [
        { text: '不要恐怖片', kind: 'hard' as const },
        { text: '輕鬆', kind: 'soft' as const },
      ],
    },
    recommendations: [
      {
        media_id: 2,
        reason: '喜劇類型適合現在轉換心情。',
        kind: 'primary' as const,
        media_snapshot: movie(2),
      },
      {
        media_id: 1,
        reason: '高評分作品，保留一點新鮮感。',
        kind: 'wildcard' as const,
        media_snapshot: movie(1),
      },
    ],
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    used_fallback: false,
  }
}

describe('context recommendation Supabase service', () => {
  it('calls one coordinator endpoint with the raw request, locale, and deadline', async () => {
    expect(RECOMMENDATION_DEADLINE_MS).toBe(31_000)
    const invoke = vi.fn().mockResolvedValue({ data: response(), error: null })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)
    const controller = new AbortController()

    const result = await requestContextRecommendations(
      '  剛失戀，但不要愛情片。 ',
      'zh-TW',
      'movie',
      controller.signal,
    )

    expect(invoke).toHaveBeenCalledWith('recommend-movies', {
      body: {
        request: '剛失戀，但不要愛情片。',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      signal: controller.signal,
      timeout: RECOMMENDATION_DEADLINE_MS,
    })
    expect(result.recommendations.map((item) => item.media_id)).toEqual([2, 1])
  })

  it('accepts an empty result and fallback items without fake reasons', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ...response(),
        recommendations: [
          {
            media_id: 1,
            kind: 'primary',
            media_snapshot: movie(1),
          },
        ],
        used_fallback: true,
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    const result = await requestContextRecommendations(
      '想看輕鬆電影',
      'zh-TW',
      'movie',
    )
    expect(result.used_fallback).toBe(true)
    expect(result.recommendations[0]?.reason).toBeUndefined()
  })

  it('accepts ten recommendations', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ...response(),
        recommendations: Array.from({ length: 10 }, (_, index) => ({
          media_id: index + 1,
          kind: 'primary',
          media_snapshot: movie(index + 1),
        })),
        used_fallback: true,
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    const result = await requestContextRecommendations(
      '想看輕鬆電影',
      'zh-TW',
      'movie',
    )
    expect(result.recommendations).toHaveLength(10)
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
      requestContextRecommendations('想看輕鬆電影', 'zh-TW', 'movie'),
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
      requestContextRecommendations('想看輕鬆電影', 'zh-TW', 'movie'),
    ).rejects.toBeInstanceOf(RecommendationRequestError)
  })

  it('preserves correctable condition error codes from the Edge Function', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({
            error: 'unresolved_person',
            condition: '同名人物',
          }),
        ),
      },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await expect(
      requestContextRecommendations('同名人物演的電影', 'zh-TW', 'movie'),
    ).rejects.toMatchObject({
      code: 'unresolved_person',
      condition: '同名人物',
    })
  })
})
