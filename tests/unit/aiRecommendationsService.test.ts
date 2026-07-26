import { describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from '@/services/supabase/client'
import { requestAiRecommendations } from '@/services/supabase/aiRecommendations'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'

vi.mock('@/services/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}))

function movie(id: number): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [28],
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

const answers: AiPickerAnswers = {
  mood: 'exciting',
  occasion: 'friends',
  pace: 'fast',
  era: 'recent',
}

describe('AI recommendation Supabase service', () => {
  it('sends submitted movies with the reason-only function contract', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        recommendations: [{ movie_id: 1, reason: '很適合今晚' }],
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    const result = await requestAiRecommendations({
      answers,
      candidates: Array.from({ length: 11 }, (_, index) => movie(index + 1)),
      locale: 'zh-TW',
    })

    expect(invoke).toHaveBeenCalledWith('recommend-movies', {
      body: {
        answers,
        movies: expect.arrayContaining([
          expect.objectContaining({ id: 1, title: 'Movie 1' }),
        ]),
        locale: 'zh-TW',
      },
      timeout: 8000,
    })
    expect(invoke.mock.calls[0][1].body.movies).toHaveLength(10)
    expect(result).toEqual({
      recommendations: [{ movie_id: 1, reason: '很適合今晚' }],
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
    })
  })

  it('passes a caller-provided timeout to the Supabase function client', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        recommendations: [{ movie_id: 1, reason: '很適合今晚' }],
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await requestAiRecommendations({
      answers,
      candidates: [movie(1)],
      locale: 'zh-TW',
      timeoutMs: 3000,
    })

    expect(invoke.mock.calls[0][1].timeout).toBe(3000)
  })

  it('rejects malformed function responses instead of treating them as recommendations', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        recommendations: [{ movie_id: 1, reason: 123 }],
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await expect(
      requestAiRecommendations({
        answers,
        candidates: [movie(1)],
        locale: 'zh-TW',
      }),
    ).rejects.toThrow('AI recommendation response has an invalid structure')
  })
})
