import { describe, expect, it } from 'vitest'
import {
  applyDeterministicMediaRules,
  buildDiscoverSearchParams,
  createPlanMessages,
  createPlanTool,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  hasMediaTypeMismatch,
  mergeCandidatePools,
  parseContextPlan,
  parseTmdbMedia,
  parseToolArguments,
  validateRecommendationRequest,
  type CandidateMedia,
} from '../../supabase/functions/recommend-movies/domain'

function movie(id: number) {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [35],
    id,
    original_language: 'en',
    original_title: `Movie ${id}`,
    overview: `Overview ${id}`,
    popularity: 100 - id,
    poster_path: null,
    release_date: '2026-01-01',
    title: `Movie ${id}`,
    video: false,
    vote_average: 8,
    vote_count: 500,
  }
}

function tv(id: number) {
  return {
    adult: false,
    backdrop_path: null,
    first_air_date: '2026-01-01',
    genre_ids: [35],
    id,
    name: `Show ${id}`,
    origin_country: ['JP'],
    original_language: 'ja',
    original_name: `Show ${id}`,
    overview: `Overview ${id}`,
    popularity: 100 - id,
    poster_path: null,
    vote_average: 8,
    vote_count: 100,
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
    include_genres: [{ id: 35, source: 'explicit' as const }],
    keywords: [
      {
        lookup_name: 'healing',
        display_label: '療癒',
        source: 'inferred' as const,
      },
    ],
    qualities: ['輕鬆'],
  },
  people: [],
  people_match: 'any' as const,
  display_labels: {
    hard: ['不要恐怖片', '90 分鐘內', '日語'],
    soft: ['輕鬆'],
  },
}

describe('context-aware recommendation domain', () => {
  it('uses OpenAI and validates a required single media type', () => {
    expect(DEFAULT_OPENAI_BASE_URL).toBe('https://api.openai.com/v1')
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-4o-mini')
    expect(
      validateRecommendationRequest({
        request: '  想看輕鬆電影 ',
        locale: 'zh-TW',
        media_type: 'movie',
      }),
    ).toEqual({
      request: '想看輕鬆電影',
      locale: 'zh-TW',
      media_type: 'movie',
    })
    expect(() =>
      validateRecommendationRequest({ request: '想看電影', locale: 'zh-TW' }),
    ).toThrow('recommendation request is invalid')
  })

  it('detects the last explicit movie or TV wording as a mismatch', () => {
    expect(
      hasMediaTypeMismatch({
        request: '不要電影，我要看日劇',
        locale: 'zh-TW',
        media_type: 'movie',
      }),
    ).toBe(true)
    expect(
      hasMediaTypeMismatch({
        request: '不要電影，我要看日劇',
        locale: 'zh-TW',
        media_type: 'tv',
      }),
    ).toBe(false)
  })

  it('uses separate movie and TV genre whitelists', () => {
    expect(
      parseContextPlan(plan, 'movie').discover_plan.include_genres,
    ).toEqual([{ id: 35, source: 'explicit' }])
    expect(() =>
      parseContextPlan(
        {
          ...plan,
          soft_preferences: {
            ...plan.soft_preferences,
            include_genres: [{ id: 10759, source: 'explicit' }],
          },
        },
        'movie',
      ),
    ).toThrow('query plan has an invalid structure')
    expect(
      parseContextPlan(
        {
          ...plan,
          hard_constraints: { exclude_genre_ids: [] },
          soft_preferences: {
            ...plan.soft_preferences,
            include_genres: [{ id: 10759, source: 'explicit' }],
          },
        },
        'tv',
      ).discover_plan.include_genres,
    ).toEqual([{ id: 10759, source: 'explicit' }])
  })

  it('keeps explicit filters when inferred preferences are relaxed', () => {
    const discoverPlan = parseContextPlan(plan, 'movie').discover_plan
    const precise = buildDiscoverSearchParams(
      'movie',
      discoverPlan,
      [123],
      'popularity.desc',
    )
    const relaxed = buildDiscoverSearchParams(
      'movie',
      discoverPlan,
      [],
      'vote_average.desc',
      false,
    )

    expect(precise.get('with_genres')).toBe('35')
    expect(precise.get('with_keywords')).toBe('123')
    expect(relaxed.get('with_genres')).toBe('35')
    expect(relaxed.has('with_keywords')).toBe(false)
    expect(relaxed.get('without_genres')).toBe('27')
    expect(relaxed.get('with_runtime.lte')).toBe('90')
    expect(relaxed.get('with_original_language')).toBe('ja')
    expect(relaxed.get('vote_count.gte')).toBe('100')
  })

  it('deterministically routes light Japanese drama and Japanese animation', () => {
    const base = parseContextPlan(
      {
        ...plan,
        hard_constraints: { exclude_genre_ids: [] },
        soft_preferences: {
          include_genres: [],
          keywords: [],
          qualities: [],
        },
      },
      'tv',
    )
    const drama = applyDeterministicMediaRules(
      {
        request: '我想看點題材輕鬆的日劇',
        locale: 'zh-TW',
        media_type: 'tv',
      },
      base,
    )
    const params = buildDiscoverSearchParams(
      'tv',
      drama.discover_plan,
      [],
      'popularity.desc',
    )
    expect(params.get('with_origin_country')).toBe('JP')
    expect(params.get('with_original_language')).toBe('ja')
    expect(params.get('without_genres')).toBe('16')
    expect(params.get('with_genres')).toBe('35')
    expect(params.get('vote_count.gte')).toBe('30')

    const anime = applyDeterministicMediaRules(
      {
        request: '我想看日本動畫',
        locale: 'zh-TW',
        media_type: 'tv',
      },
      drama,
    )
    expect(anime.discover_plan.exclude_genre_ids).not.toContain(16)
    expect(anime.discover_plan.include_genres).toContainEqual({
      id: 16,
      source: 'explicit',
    })
  })

  it('normalizes movie and TV fields and strips additive provider fields', () => {
    expect(
      parseTmdbMedia({ results: [{ ...movie(1), extra: true }] }, 'movie'),
    ).toEqual([{ ...movie(1), media_type: 'movie' }])
    expect(
      parseTmdbMedia({ results: [{ ...tv(1), extra: true }] }, 'tv'),
    ).toEqual([{ ...tv(1), media_type: 'tv' }])
  })

  it('deduplicates by media type and numeric ID', () => {
    const movieItem = parseTmdbMedia({ results: [movie(1)] }, 'movie')[0]
    const tvItem = parseTmdbMedia({ results: [tv(1)] }, 'tv')[0]
    expect(
      mergeCandidatePools(
        [movieItem as CandidateMedia],
        [tvItem as CandidateMedia],
      ),
    ).toHaveLength(2)
  })

  it('uses the selected media type in the prompt and tool schema', () => {
    const request = {
      request: '我想看日劇',
      locale: 'zh-TW' as const,
      media_type: 'tv' as const,
    }
    expect(createPlanMessages(request)[0]?.content).toContain(
      'UI-selected media type is tv',
    )
    expect(createPlanMessages(request)[1]?.content).toContain('我想看日劇')
    expect(
      createPlanTool('tv').function.parameters.properties.soft_preferences,
    ).toBeDefined()
  })

  it('extracts only the forced planning tool arguments', () => {
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
})
