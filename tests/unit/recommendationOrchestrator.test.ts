import { describe, expect, it, vi } from 'vitest'
import {
  coordinateRecommendations,
  RecommendationConditionError,
  RecommendationStageError,
  type CoordinatorConfig,
} from '../../supabase/functions/recommend-movies/orchestrator'

const config: CoordinatorConfig = {
  openaiApiKey: 'test-key',
  openaiBaseUrl: 'https://api.openai.test/v1',
  openaiModel: 'gpt-4o-mini',
  tmdbAccessToken: 'tmdb-token',
}

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    intent_summary: '符合明確條件的片單',
    hard_constraints: { exclude_genres: [] },
    soft_preferences: {
      include_genres: [],
      keywords: [],
      qualities: [],
    },
    people: [],
    people_match: 'any',
    display_labels: { hard: [], soft: [] },
    ...overrides,
  }
}

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function toolCall(value: unknown, usage?: unknown) {
  return json({
    choices: [
      {
        message: {
          tool_calls: [
            {
              function: {
                name: 'plan_movie_search',
                arguments: JSON.stringify(value),
              },
            },
          ],
        },
      },
    ],
    usage,
  })
}

describe('recommendation orchestrator', () => {
  it('uses Jev metadata and reranked membership when Decisions succeeds', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            soft_preferences: {
              include_genres: [],
              keywords: [],
              qualities: ['激勵'],
            },
          }),
        )
      }
      if (url.includes('/discover/movie')) {
        return json({ results: [movie(1), movie(2)] })
      }
      const id = (
        JSON.parse(String(init?.body)) as {
          state: { candidate: { id: number } }
        }
      ).state.candidate.id
      return json({
        answers: {
          is_relevant: { type: 'noul', noul: id === 2 ? 0.9 : 0.4 },
        },
        model: 'typesafe/jev-1.13-20260917',
        usage: { cost: 0.00001 },
      })
    })

    const result = await coordinateRecommendations(
      { request: '尋找能激勵工作的電影', locale: 'zh-TW', media_type: 'movie' },
      { ...config, openrouterApiKey: 'secret' },
      new AbortController().signal,
      fetcher,
    )

    expect(result.recommendations.map((item) => item.media_id)).toEqual([2])
    expect(result.provider).toBe('openrouter')
    expect(result.model).toBe('typesafe/jev-1.13-20260917')
    expect(result.usedFallback).toBe(false)
  })

  it('returns OpenAI usage and warns when total tokens exceed 20,000', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let requestBody: Record<string, unknown> | undefined
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).includes('/chat/completions')) {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
        return toolCall(basePlan(), {
          prompt_tokens: 19_835,
          completion_tokens: 166,
          total_tokens: 20_001,
          prompt_tokens_details: { cached_tokens: 128 },
          completion_tokens_details: { reasoning_tokens: 12 },
        })
      }
      return json({ results: [] })
    })

    const result = await coordinateRecommendations(
      {
        request: '我想看科幻片',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      { ...config, openaiModel: 'gpt-6-luna' },
      new AbortController().signal,
      fetcher,
    )

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith('openai token usage alert', {
      model: 'gpt-6-luna',
      threshold: 20_000,
      promptTokens: 19_835,
      completionTokens: 166,
      totalTokens: 20_001,
      cachedTokens: 128,
      reasoningTokens: 12,
    })
    expect(requestBody?.reasoning_effort).toBe('none')
    expect(result.usage).toEqual({
      promptTokens: 19_835,
      completionTokens: 166,
      totalTokens: 20_001,
      cachedTokens: 128,
      reasoningTokens: 12,
    })
    logSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('routes Brad Pitt through Person Search and Movie Discover with_cast', async () => {
    const urls: string[] = []
    const plan = basePlan({
      people: [{ name: '布萊德彼特', role: 'cast' }],
      display_labels: { hard: [], soft: ['布萊德彼特'] },
    })
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/chat/completions')) return toolCall(plan)
      if (url.includes('/search/person')) {
        return json({
          results: [
            {
              id: 287,
              name: '布萊德・彼特',
              original_name: 'Brad Pitt',
              known_for_department: 'Acting',
              popularity: 80,
            },
          ],
        })
      }
      return json({ results: [movie(1), movie(2)] })
    })
    const controller = new AbortController()

    const result = await coordinateRecommendations(
      {
        request: '我喜歡布萊德彼特演的電影',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      config,
      controller.signal,
      fetcher,
    )

    const discoverUrls = urls.filter((url) => url.includes('/discover/movie'))
    expect(discoverUrls).toHaveLength(2)
    expect(
      discoverUrls.every(
        (url) => new URL(url).searchParams.get('with_cast') === '287',
      ),
    ).toBe(true)
    expect(result.recommendations.map((item) => item.media_id)).toEqual([1, 2])
    expect(result.recommendations[0]?.media_snapshot.media_type).toBe('movie')
    expect(
      fetcher.mock.calls.every(
        ([, init]) => init?.signal === controller.signal,
      ),
    ).toBe(true)
  })

  it('keeps only Miyazaki Director credits and excludes Thanks credits', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            people: [{ name: '宮崎駿', role: 'director' }],
            display_labels: { hard: [], soft: ['宮崎駿導演'] },
          }),
        )
      }
      if (url.includes('/search/person')) {
        return json({
          results: [
            {
              id: 608,
              name: '宮崎駿',
              original_name: 'Hayao Miyazaki',
              known_for_department: 'Directing',
              popularity: 60,
            },
          ],
        })
      }
      if (url.includes('/person/608/movie_credits')) {
        return json({
          cast: [],
          crew: [
            { id: 1, department: 'Directing', job: 'Director' },
            { id: 2, department: 'Crew', job: 'Thanks' },
            { id: 3, department: 'Writing', job: 'Writer' },
          ],
        })
      }
      return json({ results: [movie(1), movie(2), movie(3)] })
    })

    const result = await coordinateRecommendations(
      {
        request: '我要看宮崎駿電影',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(result.recommendations.map((item) => item.media_id)).toEqual([1])
    expect(urls.some((url) => url.includes('with_crew'))).toBe(false)
  })

  it.each([
    ['any', '287|6193'],
    ['all', '287,6193'],
  ] as const)(
    'uses %s semantics for two movie actors',
    async (match, expected) => {
      const discoverUrls: string[] = []
      const fetcher = vi.fn<typeof fetch>(async (input) => {
        const url = String(input)
        if (url.includes('/chat/completions')) {
          return toolCall(
            basePlan({
              people: [
                { name: 'Brad Pitt', role: 'cast' },
                { name: 'Leonardo DiCaprio', role: 'cast' },
              ],
              people_match: match,
            }),
          )
        }
        if (url.includes('/search/person')) {
          const brad = new URL(url).searchParams.get('query') === 'Brad Pitt'
          return json({
            results: [
              {
                id: brad ? 287 : 6193,
                name: brad ? 'Brad Pitt' : 'Leonardo DiCaprio',
                known_for_department: 'Acting',
                popularity: 80,
              },
            ],
          })
        }
        discoverUrls.push(url)
        return json({ results: [movie(1)] })
      })

      await coordinateRecommendations(
        {
          request:
            match === 'all'
              ? 'Brad Pitt and Leonardo DiCaprio together in a movie'
              : 'Brad Pitt or Leonardo DiCaprio movie',
          locale: 'en',
          media_type: 'movie',
        },
        config,
        new AbortController().signal,
        fetcher,
      )

      expect(
        discoverUrls.every(
          (url) => new URL(url).searchParams.get('with_cast') === expected,
        ),
      ).toBe(true)
    },
  )

  it('does not guess between equally plausible people with the same name', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({ people: [{ name: 'Alex Kim', role: 'cast' }] }),
        )
      }
      return json({
        results: [
          {
            id: 1,
            name: 'Alex Kim',
            known_for_department: 'Acting',
            popularity: 10,
          },
          {
            id: 2,
            name: 'Alex Kim',
            known_for_department: 'Acting',
            popularity: 9,
          },
        ],
      })
    })

    await expect(
      coordinateRecommendations(
        {
          request: 'Alex Kim movie',
          locale: 'en',
          media_type: 'movie',
        },
        config,
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toMatchObject({
      code: 'unresolved_person',
      condition: 'Alex Kim',
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('resolves explicit English keywords and applies them with people', async () => {
    const discoverUrls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            people: [{ name: 'Brad Pitt', role: 'cast' }],
            soft_preferences: {
              include_genres: [],
              keywords: [
                {
                  lookup_name: 'revenge',
                  display_label: '復仇',
                  source: 'explicit',
                },
              ],
              qualities: [],
            },
          }),
        )
      }
      if (url.includes('/search/person')) {
        return json({
          results: [
            {
              id: 287,
              name: 'Brad Pitt',
              known_for_department: 'Acting',
              popularity: 80,
            },
          ],
        })
      }
      if (url.includes('/search/keyword')) {
        expect(new URL(url).searchParams.get('query')).toBe('revenge')
        return json({ results: [{ id: 9748, name: 'revenge' }] })
      }
      discoverUrls.push(url)
      return json({ results: [movie(1)] })
    })

    await coordinateRecommendations(
      {
        request: '布萊德彼特的復仇片',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(
      discoverUrls.every((url) => {
        const params = new URL(url).searchParams
        return (
          params.get('with_cast') === '287' &&
          params.get('with_keywords') === '9748'
        )
      }),
    ).toBe(true)
  })

  it('resolves an excluded TV concept and sends without_keywords to Discover', async () => {
    const discoverUrls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            hard_constraints: {
              exclude_genres: [],
              exclude_keywords: [
                { lookup_name: 'horror', display_label: 'No horror' },
              ],
            },
          }),
        )
      }
      if (url.includes('/search/keyword')) {
        const query = new URL(url).searchParams.get('query')
        return json({
          results: [
            query === 'horror'
              ? { id: 12339, name: 'horror' }
              : { id: 999, name: 'thriller' },
          ],
        })
      }
      discoverUrls.push(url)
      return json({ results: [tv(1)] })
    })

    await coordinateRecommendations(
      {
        request: 'I want a thriller series, but no horror.',
        locale: 'en',
        media_type: 'tv',
      },
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(
      discoverUrls.every(
        (url) => new URL(url).searchParams.get('without_keywords') === '12339',
      ),
    ).toBe(true)
  })

  it('returns a correctable condition error for an unresolved explicit keyword', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            soft_preferences: {
              include_genres: [],
              keywords: [
                {
                  lookup_name: 'nonexistent theme',
                  display_label: '不存在主題',
                  source: 'explicit',
                },
              ],
              qualities: [],
            },
          }),
        )
      }
      return json({ results: [] })
    })

    await expect(
      coordinateRecommendations(
        {
          request: '想看不存在主題的電影',
          locale: 'zh-TW',
          media_type: 'movie',
        },
        config,
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toMatchObject({
      code: 'unresolved_keyword',
      condition: '不存在主題',
    } satisfies Partial<RecommendationConditionError>)
    expect(
      fetcher.mock.calls.some(([input]) =>
        String(input).includes('/discover/'),
      ),
    ).toBe(false)
  })

  it('relaxes an inferred genre once while preserving an explicit keyword', async () => {
    const discoverUrls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            soft_preferences: {
              include_genres: [{ name: 'drama', source: 'inferred' }],
              keywords: [
                {
                  lookup_name: 'revenge',
                  display_label: '復仇',
                  source: 'explicit',
                },
              ],
              qualities: [],
            },
          }),
        )
      }
      if (url.includes('/search/keyword')) {
        return json({ results: [{ id: 9748, name: 'revenge' }] })
      }
      discoverUrls.push(url)
      const hasInferredGenre = new URL(url).searchParams.has('with_genres')
      return json({ results: hasInferredGenre ? [] : [movie(9)] })
    })

    const result = await coordinateRecommendations(
      {
        request: '想看復仇題材，情緒濃一點也可以',
        locale: 'zh-TW',
        media_type: 'movie',
      },
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(result.usedFallback).toBe(true)
    expect(result.recommendations.map((item) => item.media_id)).toEqual([9])
    expect(discoverUrls).toHaveLength(4)
    expect(
      discoverUrls.every(
        (url) => new URL(url).searchParams.get('with_keywords') === '9748',
      ),
    ).toBe(true)
    expect(
      discoverUrls.filter((url) =>
        new URL(url).searchParams.has('with_genres'),
      ),
    ).toHaveLength(2)
  })

  it('uses TV credits and the light Japanese TV route', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/chat/completions')) {
        return toolCall(
          basePlan({
            people: [{ name: '阿部寬', role: 'cast' }],
          }),
        )
      }
      if (url.includes('/search/person')) {
        return json({
          results: [
            {
              id: 123,
              name: '阿部寬',
              known_for_department: 'Acting',
              popularity: 30,
            },
          ],
        })
      }
      if (url.includes('/person/123/tv_credits')) {
        return json({ cast: [{ id: 7 }], crew: [] })
      }
      return json({ results: [tv(7), tv(8)] })
    })

    const result = await coordinateRecommendations(
      {
        request: '想看阿部寬演的輕鬆日劇',
        locale: 'zh-TW',
        media_type: 'tv',
      },
      config,
      new AbortController().signal,
      fetcher,
    )

    const discoverUrls = urls.filter((url) => url.includes('/discover/tv'))
    expect(result.recommendations.map((item) => item.media_id)).toEqual([7])
    expect(
      discoverUrls.every((url) => {
        const params = new URL(url).searchParams
        return (
          params.get('with_origin_country') === 'JP' &&
          params.get('with_original_language') === 'ja' &&
          params.get('without_genres') === '16' &&
          params.get('vote_count.gte') === '30' &&
          !params.has('with_cast')
        )
      }),
    ).toBe(true)
    expect(urls.some((url) => url.includes('/movie_credits'))).toBe(false)
  })

  it('labels a condition-free request as general exploration', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) return toolCall(basePlan())
      return json({ results: [movie(1)] })
    })
    const result = await coordinateRecommendations(
      { request: '隨便推薦', locale: 'zh-TW', media_type: 'movie' },
      config,
      new AbortController().signal,
      fetcher,
    )
    expect(result.plan.intent_summary).toBe('一般電影探索')
  })

  it('normalizes a failed planning stage without attempting TMDB', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      json(
        {
          error: { type: 'insufficient_quota', code: 'insufficient_quota' },
        },
        429,
      ),
    )
    try {
      await expect(
        coordinateRecommendations(
          { request: '想看輕鬆電影', locale: 'zh-TW', media_type: 'movie' },
          config,
          new AbortController().signal,
          fetcher,
        ),
      ).rejects.toMatchObject({
        stage: 'plan',
        cause: {
          message:
            'AI model request failed (status=429, type=insufficient_quota, code=insufficient_quota)',
        },
      } satisfies Partial<RecommendationStageError>)
    } finally {
      log.mockRestore()
    }
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
