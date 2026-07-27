import { describe, expect, it, vi } from 'vitest'
import {
  coordinateRecommendations,
  discoverCandidates,
  RecommendationStageError,
  type CoordinatorConfig,
} from '../../supabase/functions/recommend-movies/orchestrator'
import {
  parseContextPlan,
  type CandidateMovie,
} from '../../supabase/functions/recommend-movies/domain'

const config: CoordinatorConfig = {
  openrouterApiKey: 'test-key',
  openrouterBaseUrl: 'https://openrouter.test/api/v1',
  openrouterModel: 'test/model',
  tmdbAccessToken: 'tmdb-token',
}

const contextPlan = {
  intent_summary: '今晚用輕鬆作品轉換心情',
  hard_constraints: {
    exclude_genre_ids: [27],
    runtime_max: 90,
  },
  soft_preferences: {
    include_genre_ids: [35],
    keyword_names: ['healing'],
    qualities: ['輕鬆'],
  },
  display_labels: {
    hard: ['不要恐怖片', '90 分鐘內'],
    soft: ['輕鬆'],
  },
}

function movie(id: number): CandidateMovie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [35],
    id,
    original_language: 'en',
    original_title: `Movie ${id}`,
    overview: `Light comedy overview ${id}`,
    popularity: 100 - id,
    poster_path: null,
    release_date: '2026-01-01',
    title: `Movie ${id}`,
    video: false,
    vote_average: 8,
    vote_count: 500,
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function toolCall(name: string, value: unknown) {
  return json({
    choices: [
      {
        message: {
          tool_calls: [
            {
              function: {
                name,
                arguments: JSON.stringify(value),
              },
            },
          ],
        },
      },
    ],
  })
}

describe('recommendation orchestrator', () => {
  it('runs the complete plan, keyword, dual Discover, and rerank path', async () => {
    const popular = Array.from({ length: 10 }, (_, index) => movie(index + 1))
    const rated = Array.from({ length: 10 }, (_, index) => movie(index + 11))
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        const body = JSON.parse(String(init?.body))
        const toolName = body.tool_choice.function.name
        if (toolName === 'plan_movie_search') {
          return toolCall(toolName, contextPlan)
        }
        return toolCall(toolName, {
          recommendations: [
            {
              movie_id: 2,
              reason: '喜劇類型適合現在轉換心情。',
              kind: 'primary',
            },
            {
              movie_id: 12,
              reason: '高評分喜劇帶來穩定的輕鬆感。',
              kind: 'primary',
            },
            {
              movie_id: 1,
              reason: '熱門喜劇適合不費力地投入。',
              kind: 'primary',
            },
            {
              movie_id: 11,
              reason: '喜劇題材兼具評價與熟悉感。',
              kind: 'primary',
            },
            {
              movie_id: 3,
              reason: '同類型中保留一點不同選擇。',
              kind: 'wildcard',
            },
          ],
        })
      }
      if (url.includes('/search/keyword')) {
        return json({ results: [{ id: 123, name: 'healing' }] })
      }
      return json({
        results: url.includes('sort_by=popularity.desc') ? popular : rated,
      })
    })
    const controller = new AbortController()

    const result = await coordinateRecommendations(
      { request: '心情不好，想轉換心情。', locale: 'zh-TW' },
      config,
      controller.signal,
      fetcher,
    )

    expect(result.usedFallback).toBe(false)
    expect(result.candidates).toHaveLength(20)
    expect(result.recommendations.map((item) => item.movie_id)).toEqual([
      2, 12, 1, 11, 3,
    ])
    expect(fetcher).toHaveBeenCalledTimes(5)
    const calls = fetcher.mock.calls
    expect(calls.every(([, init]) => init?.signal === controller.signal)).toBe(
      true,
    )
    const modelBodies = calls
      .filter(([input]) => String(input).includes('/chat/completions'))
      .map(([, init]) => JSON.parse(String(init?.body)))
    expect(modelBodies.map((body) => body.tool_choice.function.name)).toEqual([
      'plan_movie_search',
      'rank_movie_candidates',
    ])
  })

  it('ignores unresolved keywords and relaxes include filters only once', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('query=missing')) return json({}, 500)
      if (url.includes('/search/keyword')) {
        return json({ results: [{ id: 123, name: 'healing' }] })
      }
      const relaxed = !url.includes('with_genres')
      return json({
        results: relaxed
          ? [movie(1), movie(2), movie(3), movie(4)]
          : [movie(1), movie(2)],
      })
    })
    const plan = parseContextPlan({
      ...contextPlan,
      soft_preferences: {
        ...contextPlan.soft_preferences,
        keyword_names: ['healing', 'missing'],
      },
    })

    const result = await discoverCandidates(
      { request: '不要恐怖片，想看輕鬆電影', locale: 'zh-TW' },
      plan,
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(result.candidates.map((item) => item.id)).toEqual([1, 2, 3, 4])
    const discoverUrls = urls.filter((url) => url.includes('/discover/movie'))
    expect(discoverUrls).toHaveLength(4)
    expect(
      discoverUrls.filter((url) => url.includes('with_genres')),
    ).toHaveLength(2)
    expect(
      discoverUrls.every(
        (url) =>
          url.includes('without_genres=27') &&
          url.includes('with_runtime.lte=90'),
      ),
    ).toBe(true)
  })

  it('returns a deterministic overview fallback when reranking fails', async () => {
    const popular = Array.from({ length: 10 }, (_, index) => movie(index + 1))
    const rated = Array.from({ length: 10 }, (_, index) => movie(index + 11))
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.includes('/chat/completions')) {
        const body = JSON.parse(String(init?.body))
        return body.tool_choice.function.name === 'plan_movie_search'
          ? toolCall('plan_movie_search', contextPlan)
          : toolCall('rank_movie_candidates', { recommendations: [] })
      }
      if (url.includes('/search/keyword')) {
        return json({ results: [{ id: 123, name: 'healing' }] })
      }
      return json({
        results: url.includes('sort_by=popularity.desc') ? popular : rated,
      })
    })

    const result = await coordinateRecommendations(
      { request: '想看輕鬆電影', locale: 'zh-TW' },
      config,
      new AbortController().signal,
      fetcher,
    )

    expect(result.usedFallback).toBe(true)
    expect(result.recommendations.map((item) => item.movie_id)).toEqual([
      1, 11, 2, 12, 3,
    ])
    expect(result.recommendations.every((item) => !item.reason)).toBe(true)
  })

  it('normalizes a failed first model stage without attempting TMDB', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, 500))

    await expect(
      coordinateRecommendations(
        { request: '想看輕鬆電影', locale: 'zh-TW' },
        config,
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toMatchObject({
      stage: 'plan',
    } satisfies Partial<RecommendationStageError>)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('passes an already-aborted deadline signal to the first upstream request', async () => {
    const controller = new AbortController()
    controller.abort(new Error('deadline exceeded'))
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.signal).toBe(controller.signal)
      throw controller.signal.reason
    })

    await expect(
      coordinateRecommendations(
        { request: '想看輕鬆電影', locale: 'zh-TW' },
        config,
        controller.signal,
        fetcher,
      ),
    ).rejects.toMatchObject({ stage: 'plan' })
  })
})
