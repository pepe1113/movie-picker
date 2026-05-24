import { describe, expect, it } from 'vitest'
import {
  createRecommendationPrompt,
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  normalizeRecommendations,
  validateRecommendationRequest,
} from '../../supabase/functions/recommend-movies/domain'

describe('recommend-movies edge function domain', () => {
  it('uses the confirmed low-cost DeepSeek Flash model defaults', () => {
    expect(DEFAULT_DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com')
    expect(DEFAULT_DEEPSEEK_MODEL).toBe('deepseek-v4-flash')
  })

  it('rejects unbounded candidate lists', () => {
    expect(() =>
      validateRecommendationRequest({
        answers: { mood: 'exciting' },
        locale: 'zh-TW',
        candidates: Array.from({ length: 21 }, (_, index) => ({
          id: index + 1,
          title: `Movie ${index + 1}`,
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        })),
      }),
    ).toThrow('candidates must include 1-20 movies')
  })

  it('normalizes recommendations and keeps only submitted candidate ids', () => {
    const normalized = normalizeRecommendations(
      [
        { movie_id: 2, reason: '符合你想看的節奏' },
        { movie_id: 999, reason: 'not submitted' },
        { movie_id: 1, reason: '' },
      ],
      new Set([1, 2]),
    )

    expect(normalized).toEqual([
      { movie_id: 2, reason: '符合你想看的節奏' },
      { movie_id: 1, reason: 'Recommended from your selected candidates.' },
    ])
  })

  it('asks the provider to return reasons in the requested UI language', () => {
    const zhPrompt = createRecommendationPrompt({
      answers: { mood: 'exciting' },
      locale: 'zh-TW',
      candidates: [
        {
          id: 1,
          title: 'Movie 1',
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        },
      ],
    })
    const enPrompt = createRecommendationPrompt({
      answers: { mood: 'exciting' },
      locale: 'en',
      candidates: [
        {
          id: 1,
          title: 'Movie 1',
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        },
      ],
    })

    expect(zhPrompt[0].content).toContain('Traditional Chinese')
    expect(zhPrompt[1].content).toContain('"output_language":"Traditional Chinese"')
    expect(enPrompt[0].content).toContain('English')
    expect(enPrompt[1].content).toContain('"output_language":"English"')
  })
})
