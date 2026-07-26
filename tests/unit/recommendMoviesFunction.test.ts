import { describe, expect, it } from 'vitest'
import {
  createRecommendationPrompt,
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  normalizeRecommendations,
  parseProviderRecommendationResponse,
  validateRecommendationRequest,
} from '../../supabase/functions/recommend-movies/domain'

const answers = {
  mood: 'exciting',
  occasion: 'friends',
  pace: 'fast',
  era: 'recent',
} as const

function candidate(id: number) {
  return {
    id,
    title: `Movie ${id}`,
    overview: '',
    release_date: '2026-01-01',
    vote_average: 7,
    genre_ids: [],
  }
}

describe('recommend-movies edge function domain', () => {
  it('uses the confirmed low-cost DeepSeek Flash model defaults', () => {
    expect(DEFAULT_DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com')
    expect(DEFAULT_DEEPSEEK_MODEL).toBe('deepseek-v4-flash')
  })

  it('rejects movie lists above the reason generation limit', () => {
    expect(() =>
      validateRecommendationRequest({
        answers,
        locale: 'zh-TW',
        movies: Array.from({ length: 11 }, (_, index) => candidate(index + 1)),
      }),
    ).toThrow('movies must include 1-10 movies')
  })

  it('rejects malformed request fields with Zod validation', () => {
    expect(() =>
      validateRecommendationRequest({
        answers,
        locale: 'zh-TW',
        movies: [
          {
            id: 'not-a-number',
            title: 'Movie 1',
            overview: '',
            release_date: '2026-01-01',
            vote_average: 7,
            genre_ids: [],
          },
        ],
      }),
    ).toThrow('request body is invalid')
  })

  it('requires the complete four-question picker contract', () => {
    expect(() =>
      validateRecommendationRequest({
        answers: { mood: 'exciting' },
        locale: 'zh-TW',
        movies: [candidate(1)],
      }),
    ).toThrow('request body is invalid')
  })

  it('accepts only a structured DeepSeek recommendations response', () => {
    expect(
      parseProviderRecommendationResponse(
        {
          recommendations: [{ movie_id: 1, reason: '很適合今晚' }],
        },
        [candidate(1)],
      ),
    ).toEqual({
      recommendations: [{ movie_id: 1, reason: '很適合今晚' }],
    })

    expect(() =>
      parseProviderRecommendationResponse(
        {
          recommendations: [{ movie_id: 1, reason: 123 }],
        },
        [candidate(1)],
      ),
    ).toThrow('DeepSeek response has an invalid structure')

    expect(() =>
      parseProviderRecommendationResponse({ recommendations: [] }, [
        candidate(1),
      ]),
    ).toThrow('DeepSeek response has an invalid structure')
  })

  it('rejects missing, duplicated, unknown, or reordered candidate ids', () => {
    const movies = [candidate(1), candidate(2)]

    for (const recommendations of [
      [{ movie_id: 1, reason: '只回一部' }],
      [
        { movie_id: 1, reason: '第一部' },
        { movie_id: 1, reason: '重複第一部' },
      ],
      [
        { movie_id: 1, reason: '第一部' },
        { movie_id: 999, reason: '陌生電影' },
      ],
      [
        { movie_id: 2, reason: '第二部' },
        { movie_id: 1, reason: '第一部' },
      ],
    ]) {
      expect(() =>
        parseProviderRecommendationResponse({ recommendations }, movies),
      ).toThrow('DeepSeek response has an invalid structure')
    }
  })

  it('normalizes one reason per submitted movie in submitted order', () => {
    const normalized = normalizeRecommendations(
      [
        { movie_id: 2, reason: '符合你想看的節奏' },
        { movie_id: 999, reason: 'not submitted' },
        { movie_id: 1, reason: '' },
      ],
      [
        {
          id: 1,
          title: 'Movie 1',
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        },
        {
          id: 2,
          title: 'Movie 2',
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        },
      ],
      'zh-TW',
    )

    expect(normalized).toEqual([
      { movie_id: 1, reason: '這部片符合你的選片條件。' },
      { movie_id: 2, reason: '符合你想看的節奏' },
    ])
  })

  it('limits generated reason length by locale', () => {
    const zhReason =
      '這是一段明確超過五十個字的推薦理由，應該被後端截斷，避免畫面文案過長影響推薦卡片排版與閱讀節奏，並保持理由簡潔。'
    const enReason =
      'This recommendation reason is intentionally longer than one hundred and twenty characters so the backend trims it before returning the response.'

    expect(
      normalizeRecommendations(
        [{ movie_id: 1, reason: zhReason }],
        [
          {
            id: 1,
            title: 'Movie 1',
            overview: '',
            release_date: '2026-01-01',
            vote_average: 7,
            genre_ids: [],
          },
        ],
        'zh-TW',
      )[0].reason,
    ).toHaveLength(50)
    expect(
      normalizeRecommendations(
        [{ movie_id: 1, reason: enReason }],
        [
          {
            id: 1,
            title: 'Movie 1',
            overview: '',
            release_date: '2026-01-01',
            vote_average: 7,
            genre_ids: [],
          },
        ],
        'en',
      )[0].reason,
    ).toHaveLength(120)
  })

  it('asks the provider to return reasons in the requested UI language', () => {
    const zhPrompt = createRecommendationPrompt({
      answers,
      locale: 'zh-TW',
      movies: [
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
      answers,
      locale: 'en',
      movies: [
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
    expect(zhPrompt[1].content).toContain(
      '"output_language":"Traditional Chinese"',
    )
    expect(enPrompt[0].content).toContain('English')
    expect(enPrompt[1].content).toContain('"output_language":"English"')
  })
})
