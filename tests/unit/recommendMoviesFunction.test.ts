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

  it('rejects movie lists above the reason generation limit', () => {
    expect(() =>
      validateRecommendationRequest({
        answers: { mood: 'exciting' },
        locale: 'zh-TW',
        movies: Array.from({ length: 11 }, (_, index) => ({
          id: index + 1,
          title: `Movie ${index + 1}`,
          overview: '',
          release_date: '2026-01-01',
          vote_average: 7,
          genre_ids: [],
        })),
      }),
    ).toThrow('movies must include 1-10 movies')
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
      answers: { mood: 'exciting' },
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
      answers: { mood: 'exciting' },
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
    expect(zhPrompt[1].content).toContain('"output_language":"Traditional Chinese"')
    expect(enPrompt[0].content).toContain('English')
    expect(enPrompt[1].content).toContain('"output_language":"English"')
  })
})
