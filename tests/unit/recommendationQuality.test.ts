import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  coordinateRecommendations,
  type CoordinatorConfig,
} from '../../supabase/functions/recommend-movies/orchestrator'
import { prefersObscure } from '../../supabase/functions/recommend-movies/discovery'
import {
  acclaimScore,
  blendedScore,
  clearRatingsCache,
  familiarityScore,
  parseOmdbRatings,
} from '../../supabase/functions/recommend-movies/ranking'
import { rerankCandidates } from '../../supabase/functions/recommend-movies/rerank'
import type { CandidateMedia } from '../../supabase/functions/recommend-movies/tmdb'
import type { ContextPlan } from '../../supabase/functions/recommend-movies/domain'

const config: CoordinatorConfig = {
  openaiApiKey: 'test-key',
  openaiBaseUrl: 'https://api.openai.test/v1',
  openaiModel: 'gpt-4o-mini',
  tmdbAccessToken: 'tmdb-token',
}

function movie(
  id: number,
  overrides: Partial<{
    overview: string
    vote_average: number
    vote_count: number
  }> = {},
) {
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
    release_date: '2020-01-01',
    title: `Movie ${id}`,
    video: false,
    vote_average: 7,
    vote_count: 5000,
    ...overrides,
  }
}

const candidate = (id: number, overrides = {}) =>
  ({ ...movie(id, overrides), media_type: 'movie' }) as CandidateMedia

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function toolCall() {
  return json({
    choices: [
      {
        message: {
          tool_calls: [
            {
              type: 'function',
              function: {
                name: 'plan_movie_search',
                arguments: JSON.stringify({
                  intent_summary: '片單',
                  hard_constraints: { exclude_genres: [] },
                  soft_preferences: {
                    include_genres: [],
                    keywords: [],
                    qualities: [],
                  },
                  people: [],
                  people_match: 'any',
                  display_labels: { hard: [], soft: [] },
                }),
              },
            },
          ],
        },
      },
    ],
  })
}

const plan = {
  intent_summary: '輕鬆喜劇',
  soft_preferences: { include_genres: [], keywords: [], qualities: ['輕鬆'] },
  display_labels: { hard: [], soft: [] },
} as unknown as ContextPlan

describe('candidate quality tiers', () => {
  it('stops at the strictest vote tier once it has enough candidates', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/chat/completions')) return toolCall()
      const offset = url.includes('vote_average.desc') ? 100 : 0
      return json({
        results: Array.from({ length: 10 }, (_, i) => movie(offset + i + 1)),
      })
    })

    await coordinateRecommendations(
      { request: '想看喜劇', locale: 'en', media_type: 'movie' },
      config,
      new AbortController().signal,
      fetcher,
    )

    const discover = urls.filter((url) => url.includes('/discover/movie'))
    expect(discover).toHaveLength(2)
    expect(
      discover.every(
        (url) => new URL(url).searchParams.get('vote_count.gte') === '1000',
      ),
    ).toBe(true)
  })

  it('goes straight to the widest tier for an explicit hidden-gem request', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/chat/completions')) return toolCall()
      return json({ results: [movie(1)] })
    })

    await coordinateRecommendations(
      { request: '想看冷門的喜劇', locale: 'en', media_type: 'movie' },
      config,
      new AbortController().signal,
      fetcher,
    )

    const discover = urls.filter((url) => url.includes('/discover/movie'))
    expect(discover).toHaveLength(2)
    expect(new URL(discover[0]!).searchParams.get('vote_count.gte')).toBe('100')
  })

  it('reads negated obscurity as a request for familiar titles', () => {
    expect(prefersObscure('想看冷門好片')).toBe(true)
    expect(prefersObscure('小眾的獨立電影')).toBe(true)
    expect(prefersObscure('some underrated thrillers')).toBe(true)
    expect(prefersObscure('不要太冷門的科幻片')).toBe(false)
    expect(prefersObscure('別太冷門')).toBe(false)
    expect(prefersObscure('something not too obscure')).toBe(false)
    // A negation earlier in the clause, not only right before the term.
    expect(prefersObscure('我不想看冷門的，要大家都看過的經典')).toBe(false)
    expect(prefersObscure('不喜歡小眾')).toBe(false)
    expect(prefersObscure("I don't want anything obscure")).toBe(false)
    expect(prefersObscure('no niche stuff')).toBe(false)
    expect(prefersObscure('avoid hidden gems')).toBe(false)
    // A contrast or a later clause does not cancel the request.
    expect(prefersObscure('想看冷門但好看的獨立製作，不要好萊塢大製作。')).toBe(
      true,
    )
    expect(prefersObscure('I want hidden gems, nothing scary')).toBe(true)
    // English terms need word boundaries.
    expect(prefersObscure('a renichement drama')).toBe(false)
  })

  it('fills an empty zh-TW overview with the en-US overview', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/chat/completions')) return toolCall()
      if (url.includes('/movie/2?language=en-US')) {
        return json({ id: 2, overview: 'English overview' })
      }
      return json({
        results: Array.from({ length: 10 }, (_, i) =>
          movie(i + 1, i === 1 ? { overview: '' } : {}),
        ),
      })
    })

    const result = await coordinateRecommendations(
      { request: '想看喜劇', locale: 'zh-TW', media_type: 'movie' },
      config,
      new AbortController().signal,
      fetcher,
    )

    const filled = result.candidates.find((media) => media.id === 2)
    expect(filled?.overview).toBe('English overview')
    expect(
      fetcher.mock.calls.filter(([url]) =>
        String(url).includes('?language=en-US'),
      ),
    ).toHaveLength(1)
  })
})

describe('blended ranking', () => {
  afterEach(() => clearRatingsCache())

  it('shrinks a high average from few votes toward the prior', () => {
    const fewVotes = candidate(1, { vote_average: 9.2, vote_count: 120 })
    const manyVotes = candidate(2, { vote_average: 8.2, vote_count: 30000 })
    expect(acclaimScore(manyVotes)).toBeGreaterThan(acclaimScore(fewVotes))
    expect(familiarityScore(manyVotes)).toBeGreaterThan(
      familiarityScore(fewVotes),
    )
  })

  it('ranks equally known titles the same whether or not OMDb resolved', () => {
    const media = candidate(1, { vote_count: 20000 })
    expect(familiarityScore(media)).toBe(
      familiarityScore(candidate(2, { vote_count: 20000 })),
    )
    expect(
      blendedScore(media, 0.8, { imdbVotes: 400000 }) -
        blendedScore(media, 0.8),
    ).toBe(0)
  })

  it('keeps a high IMDb rating meaningful when IMDb votes are missing', () => {
    const media = candidate(1, { vote_average: 8.5, vote_count: 20000 })
    expect(acclaimScore(media, { imdbRating: 0.89 })).toBeGreaterThan(
      acclaimScore(media, { imdbRating: 0.89, imdbVotes: 0 }),
    )
    expect(acclaimScore(media, { imdbRating: 0.89 })).toBeGreaterThan(0.8)
  })

  it('gives external sources a fixed half weight however many there are', () => {
    const media = candidate(1, { vote_average: 7, vote_count: 20000 })
    expect(acclaimScore(media, { rottenTomatoes: 0.9 })).toBeCloseTo(
      acclaimScore(media, { rottenTomatoes: 0.9, metacritic: 0.9 }),
    )
  })

  it('parses OMDb Rotten Tomatoes, Metacritic and IMDb fields', () => {
    expect(
      parseOmdbRatings({
        Response: 'True',
        imdbRating: '8.1',
        imdbVotes: '1,234,567',
        Metascore: '74',
        Ratings: [{ Source: 'Rotten Tomatoes', Value: '93%' }],
      }),
    ).toEqual({
      imdbRating: expect.closeTo(0.81, 6),
      imdbVotes: 1234567,
      rottenTomatoes: expect.closeTo(0.93, 6),
      metacritic: expect.closeTo(0.74, 6),
    })
    expect(parseOmdbRatings({ Response: 'False' })).toBeUndefined()
    expect(
      parseOmdbRatings({
        Response: 'True',
        imdbRating: 'N/A',
        Metascore: 'N/A',
      }),
    ).toBeUndefined()
  })

  it('lets acclaim and familiarity reorder close semantic scores', () => {
    const obscure = candidate(1, { vote_average: 6.4, vote_count: 150 })
    const classic = candidate(2, { vote_average: 8.3, vote_count: 20000 })
    expect(blendedScore(classic, 0.78)).toBeGreaterThan(
      blendedScore(obscure, 0.82),
    )
    // A clearly better semantic match still wins.
    expect(blendedScore(obscure, 0.95)).toBeGreaterThan(
      blendedScore(classic, 0.55),
    )
  })

  it('uses OMDb ratings in the final order and caches lookups', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.includes('/external_ids')) {
        const id = Number(/movie\/(\d+)/.exec(url)?.[1])
        return json({ imdb_id: `tt000000${id}` })
      }
      if (url.includes('omdbapi.com')) {
        const fresh = url.includes('tt0000002')
        return json({
          Response: 'True',
          imdbRating: fresh ? '8.9' : '5.1',
          imdbVotes: fresh ? '900,000' : '2,000',
          Ratings: [
            { Source: 'Rotten Tomatoes', Value: fresh ? '97%' : '20%' },
          ],
        })
      }
      const id = (
        JSON.parse(String(init?.body)) as {
          state: { candidate: { id: number } }
        }
      ).state.candidate.id
      return json({
        answers: { is_relevant: { type: 'noul', noul: id === 1 ? 0.8 : 0.75 } },
        model: 'typesafe/jev-1.13',
      })
    })
    const candidates = [candidate(1), candidate(2)]
    const run = () =>
      rerankCandidates(
        candidates,
        plan,
        [],
        'or-key',
        new AbortController().signal,
        fetcher,
        { tmdbAccessToken: 't', omdbApiKey: 'omdb' },
      )

    const first = await run()
    expect(first.candidates.map((media) => media.id)).toEqual([2, 1])
    expect(first.scores[0]).toMatchObject({ id: 2, semantic: 0.75 })

    await run()
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).includes('omdbapi.com')),
    ).toHaveLength(2)
  })

  it('caches failed lookups and stops calling OMDb after a quota error', async () => {
    let omdbStatus = 500
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.includes('/external_ids')) return json({ imdb_id: 'tt0000001' })
      if (url.includes('omdbapi.com')) {
        return new Response('{}', { status: omdbStatus })
      }
      const id = (
        JSON.parse(String(init?.body)) as {
          state: { candidate: { id: number } }
        }
      ).state.candidate.id
      return json({
        answers: { is_relevant: { type: 'noul', noul: 0.8 } },
        model: 'typesafe/jev-1.13',
        id,
      })
    })
    const omdbCalls = () =>
      fetcher.mock.calls.filter(([url]) => String(url).includes('omdbapi.com'))
        .length
    const run = (ids: number[]) =>
      rerankCandidates(
        ids.map((id) => candidate(id)),
        plan,
        [],
        'or-key',
        new AbortController().signal,
        fetcher,
        { tmdbAccessToken: 't', omdbApiKey: 'omdb' },
      )

    await run([1])
    await run([1])
    expect(omdbCalls()).toBe(1)

    omdbStatus = 401
    await run([2])
    await run([3])
    expect(omdbCalls()).toBe(2)
  })

  it('skips OMDb without a key and when every decision fails', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('', { status: 500 }),
    )
    const result = await rerankCandidates(
      [candidate(1, { vote_count: 200 }), candidate(2, { vote_count: 40000 })],
      plan,
      [],
      'or-key',
      new AbortController().signal,
      fetcher,
      { tmdbAccessToken: 't', omdbApiKey: 'omdb' },
    )
    expect(result.fullFallback).toBe(true)
    expect(result.candidates.map((media) => media.id)).toEqual([2, 1])
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes('omdbapi.com')),
    ).toBe(false)
  })
})
