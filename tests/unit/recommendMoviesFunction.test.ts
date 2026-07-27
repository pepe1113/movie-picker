import { describe, expect, it } from 'vitest'
import {
  buildDiscoverSearchParams,
  createPlanMessages,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  mergeCandidatePools,
  parseContextPlan,
  parseRankedRecommendations,
  parseToolArguments,
  validateRecommendationRequest,
  type CandidateMovie,
} from '../../supabase/functions/recommend-movies/domain'

function movie(id: number, overview = `Overview ${id}`): CandidateMovie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [35],
    id,
    original_language: 'en',
    original_title: `Movie ${id}`,
    overview,
    popularity: 100 - id,
    poster_path: null,
    release_date: '2026-01-01',
    title: `Movie ${id}`,
    video: false,
    vote_average: 8,
    vote_count: 500,
  }
}

const plan = {
  intent_summary: '轉換心情，選擇輕鬆且好理解的作品',
  hard_constraints: {
    exclude_genre_ids: [27],
    runtime_max: 90,
    original_language: 'ja',
  },
  soft_preferences: {
    include_genre_ids: [35],
    keyword_names: ['healing'],
    qualities: ['輕鬆', '低理解負擔'],
  },
  display_labels: {
    hard: ['不要恐怖片', '90 分鐘內', '日語'],
    soft: ['輕鬆', '低理解負擔'],
  },
}

describe('context-aware recommendation domain', () => {
  it('uses the configured OpenRouter endpoint and replaceable default model', () => {
    expect(DEFAULT_OPENROUTER_BASE_URL).toBe('https://openrouter.ai/api/v1')
    expect(DEFAULT_OPENROUTER_MODEL).toBe('inclusionai/ling-3.0-flash:free')
  })

  it('validates and trims one natural-language request', () => {
    expect(
      validateRecommendationRequest({
        request: '  工作很累，想看不用動腦的電影。 ',
        locale: 'zh-TW',
      }),
    ).toEqual({
      request: '工作很累，想看不用動腦的電影。',
      locale: 'zh-TW',
    })
    expect(() =>
      validateRecommendationRequest({ request: ' ', locale: 'zh-TW' }),
    ).toThrow('movie request is invalid')
  })

  it('derives a strict Discover plan from validated intent fields', () => {
    expect(parseContextPlan(plan)).toMatchObject({
      discover_plan: {
        include_genre_ids: [35],
        exclude_genre_ids: [27],
        keyword_names: ['healing'],
        runtime_max: 90,
        original_language: 'ja',
      },
    })
    expect(() =>
      parseContextPlan({
        ...plan,
        soft_preferences: {
          ...plan.soft_preferences,
          include_genre_ids: [999],
        },
      }),
    ).toThrow('query plan has an invalid structure')
  })

  it('requires a visible label for every hard constraint', () => {
    expect(() =>
      parseContextPlan({
        ...plan,
        display_labels: {
          hard: ['不要恐怖片'],
          soft: ['輕鬆'],
        },
      }),
    ).toThrow('query plan has an invalid structure')
  })

  it('relaxes only include conditions and preserves every hard filter', () => {
    const discoverPlan = parseContextPlan(plan).discover_plan
    const precise = buildDiscoverSearchParams(
      discoverPlan,
      [123],
      'popularity.desc',
    )
    const relaxed = buildDiscoverSearchParams(
      discoverPlan,
      [123],
      'vote_average.desc',
      true,
    )

    expect(precise.get('with_genres')).toBe('35')
    expect(precise.get('with_keywords')).toBe('123')
    expect(relaxed.has('with_genres')).toBe(false)
    expect(relaxed.has('with_keywords')).toBe(false)
    expect(relaxed.get('without_genres')).toBe('27')
    expect(relaxed.get('with_runtime.lte')).toBe('90')
    expect(relaxed.get('with_original_language')).toBe('ja')
    expect(relaxed.get('include_adult')).toBe('false')
  })

  it('interleaves popularity and rating results deterministically', () => {
    expect(
      mergeCandidatePools(
        [movie(1), movie(2), movie(3)],
        [movie(3), movie(4), movie(5)],
        5,
      ).map((item) => item.id),
    ).toEqual([1, 3, 2, 4, 5])
  })

  it('extracts only the forced tool call arguments', () => {
    expect(
      parseToolArguments(
        {
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: 'plan_movie_search',
                      arguments: JSON.stringify(plan),
                    },
                  },
                ],
              },
            },
          ],
        },
        'plan_movie_search',
      ),
    ).toEqual(plan)
  })

  it('accepts reordered candidate IDs with at most one wildcard', () => {
    const candidates = [movie(1), movie(2)]
    expect(
      parseRankedRecommendations(
        {
          recommendations: [
            {
              movie_id: 2,
              reason: '輕鬆喜劇類型，適合現在轉換心情。',
              kind: 'primary',
            },
            {
              movie_id: 1,
              reason: '高評分作品，保留一點新鮮感。',
              kind: 'wildcard',
            },
          ],
        },
        candidates,
        'zh-TW',
      ).map((item) => item.movie_id),
    ).toEqual([2, 1])
  })

  it.each([
    {
      name: 'unknown candidate',
      recommendations: [
        {
          movie_id: 99,
          reason: '輕鬆喜劇類型，適合轉換心情。',
          kind: 'primary',
        },
        {
          movie_id: 1,
          reason: '高評分作品，帶來穩定觀影體驗。',
          kind: 'primary',
        },
      ],
    },
    {
      name: 'duplicate candidate',
      recommendations: [
        {
          movie_id: 1,
          reason: '輕鬆喜劇類型，適合轉換心情。',
          kind: 'primary',
        },
        {
          movie_id: 1,
          reason: '高評分作品，帶來穩定觀影體驗。',
          kind: 'primary',
        },
      ],
    },
    {
      name: 'two wildcards',
      recommendations: [
        {
          movie_id: 1,
          reason: '輕鬆喜劇類型，適合轉換心情。',
          kind: 'wildcard',
        },
        {
          movie_id: 2,
          reason: '高評分作品，帶來穩定觀影體驗。',
          kind: 'wildcard',
        },
      ],
    },
  ])('rejects $name', ({ recommendations }) => {
    expect(() =>
      parseRankedRecommendations(
        { recommendations },
        [movie(1), movie(2)],
        'zh-TW',
      ),
    ).toThrow('reranking result has an invalid structure')
  })

  it('rejects generic reasons and copied overview text', () => {
    expect(() =>
      parseRankedRecommendations(
        {
          recommendations: [
            { movie_id: 1, reason: '符合你的條件', kind: 'primary' },
          ],
        },
        [movie(1)],
        'zh-TW',
      ),
    ).toThrow()

    const overview = '這是一段足夠長而且不應直接複製的電影介紹文字'
    expect(() =>
      parseRankedRecommendations(
        {
          recommendations: [{ movie_id: 1, reason: overview, kind: 'primary' }],
        },
        [movie(1, overview)],
        'zh-TW',
      ),
    ).toThrow()
  })

  it.each([
    '工作很累，想看不用動腦的電影。',
    '心情不好，想轉換心情。',
    '剛失戀，想大哭。',
    '剛失戀，但不要愛情片。',
    '和家人看，不要恐怖或成人內容。',
    '想看 90 分鐘內的輕鬆電影。',
    '很無聊，想刺激一點但不要恐怖片。',
    '想看近年的日語療癒電影。',
  ])('keeps the acceptance request intact for planning: %s', (request) => {
    const messages = createPlanMessages({ request, locale: 'zh-TW' })
    expect(messages[1]?.content).toContain(request)
    expect(messages[0]?.content).toContain(
      'Only conditions explicitly stated by the user may become hard constraints',
    )
    expect(messages[0]?.content).toContain(
      'default toward gentle mood regulation',
    )
  })
})
