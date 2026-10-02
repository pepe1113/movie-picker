import { describe, expect, it, vi } from 'vitest'
import { handleMediaDetailRequest } from '../../supabase/functions/media-detail/handler'

const movieDetail = {
  adult: false,
  backdrop_path: null,
  budget: 0,
  genres: [{ id: 18, name: 'Drama' }],
  id: 42,
  imdb_id: 'tt0042000',
  original_language: 'en',
  original_title: 'Movie',
  overview: 'Overview',
  popularity: 10,
  poster_path: null,
  release_date: '2026-01-01',
  revenue: 0,
  runtime: 120,
  status: 'Released',
  tagline: '',
  title: 'Movie',
  video: false,
  vote_average: 8,
  vote_count: 100,
}

const tvDetail = {
  adult: false,
  backdrop_path: null,
  episode_run_time: [45],
  first_air_date: '2026-01-01',
  genres: [{ id: 18, name: 'Drama' }],
  id: 42,
  name: 'TV show',
  next_episode_to_air: null,
  number_of_episodes: 10,
  number_of_seasons: 2,
  origin_country: ['TW'],
  original_language: 'zh',
  original_name: 'TV show',
  overview: 'Overview',
  popularity: 10,
  poster_path: null,
  status: 'Returning Series',
  tagline: '',
  vote_average: 8,
  vote_count: 100,
}

function request(mediaType: 'movie' | 'tv' = 'movie', id = 42) {
  return new Request('https://example.com/media-detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: mediaType, id, language: 'zh-TW' }),
  })
}

function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status })
}

function providerFetch(mediaType: 'movie' | 'tv' = 'movie') {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    if (url.hostname === 'www.omdbapi.com') {
      return reply({
        Response: 'True',
        Ratings: [{ Source: 'Internet Movie Database', Value: '8/10' }],
      })
    }
    if (url.pathname.endsWith('/aggregate_credits')) {
      return reply({
        id: 42,
        cast: [
          {
            id: 1,
            name: 'Actor',
            profile_path: null,
            roles: [{ character: 'Lead', credit_id: 'credit-1' }],
          },
        ],
        crew: [],
      })
    }
    if (url.pathname.endsWith('/credits')) {
      return reply({
        id: 42,
        cast: [{ id: 1, name: 'Actor', profile_path: null, character: 'Lead' }],
        crew: [],
      })
    }
    if (url.pathname.endsWith('/videos')) {
      return reply({
        id: 42,
        results: [
          { key: 'trailer', name: 'Trailer', site: 'YouTube', type: 'Trailer' },
        ],
      })
    }
    return reply(mediaType === 'tv' ? tvDetail : movieDetail)
  })
}

describe('media-detail Edge Function', () => {
  it('handles preflight before parsing a body or reading secrets, and rejects invalid input', async () => {
    const preflight = await handleMediaDetailRequest(
      new Request('https://example.com/media-detail', { method: 'OPTIONS' }),
      {},
    )
    expect(preflight.status).toBe(200)
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain(
      'apikey',
    )

    for (const body of [
      { media_type: 'person', id: 42, language: 'zh-TW' },
      { media_type: 'movie', id: -1, language: 'zh-TW' },
      { media_type: 'movie', id: 42, language: 'ja-JP' },
    ]) {
      const response = await handleMediaDetailRequest(
        new Request('https://example.com', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
        {},
      )
      expect(response.status).toBe(400)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    }

    const missingSecret = await handleMediaDetailRequest(request(), {})
    expect(missingSecret.status).toBe(500)
    expect(missingSecret.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('combines movie detail, credits, trailer and IMDb in one response', async () => {
    const fetcher = providerFetch()
    const response = await handleMediaDetailRequest(request(), {
      tmdbToken: 'tmdb-secret',
      omdbKey: 'omdb-secret',
      fetcher: fetcher as typeof fetch,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.detail.title).toBe('Movie')
    expect(data.credits.cast[0].character).toBe('Lead')
    expect(data.videos.results[0].key).toBe('trailer')
    expect(data.omdb.Ratings[0].Value).toBe('8/10')
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(
      fetcher.mock.calls.map(([url]) => new URL(String(url)).hostname),
    ).toEqual([
      'api.themoviedb.org',
      'api.themoviedb.org',
      'api.themoviedb.org',
      'www.omdbapi.com',
    ])
  })

  it('uses aggregate credits for TV and never calls OMDb', async () => {
    const fetcher = providerFetch('tv')
    const response = await handleMediaDetailRequest(request('tv'), {
      tmdbToken: 'tmdb-secret',
      omdbKey: 'omdb-secret',
      fetcher: fetcher as typeof fetch,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.detail.number_of_seasons).toBe(2)
    expect(data.credits.cast[0].roles[0].character).toBe('Lead')
    expect(data.omdb).toBeNull()
    expect(
      fetcher.mock.calls.some(([url]) =>
        String(url).includes('/aggregate_credits'),
      ),
    ).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('shows detail when optional providers fail or send invalid bodies', async () => {
    const warn = vi.fn()
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/credits')) return reply({ cast: [{ name: 'No ID' }] })
      if (url.includes('/videos')) return reply({ results: null })
      if (url.includes('omdbapi')) throw new Error('provider down')
      return reply(movieDetail)
    })
    const response = await handleMediaDetailRequest(request(), {
      tmdbToken: 'tmdb-secret',
      omdbKey: 'omdb-secret',
      fetcher: fetcher as typeof fetch,
      warn,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.credits.cast).toEqual([])
    expect(data.videos.results).toEqual([])
    expect(data.omdb).toBeNull()
    expect(warn.mock.calls.map(([source]) => source)).toEqual([
      'credits',
      'videos',
      'omdb',
    ])
  })

  it('drops TV cast with missing roles instead of returning a broken page payload', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('aggregate_credits'))
        return reply({ cast: [{ id: 1, name: 'Actor', profile_path: null }] })
      if (String(input).includes('/videos')) return reply({ results: [] })
      return reply(tvDetail)
    })
    const response = await handleMediaDetailRequest(request('tv'), {
      tmdbToken: 'tmdb-secret',
      fetcher: fetcher as typeof fetch,
      warn: vi.fn(),
    })
    expect((await response.json()).credits.cast).toEqual([])
  })

  it('omits OMDb when the key or IMDb ID is missing', async () => {
    const fetcher = providerFetch()
    const response = await handleMediaDetailRequest(request(), {
      tmdbToken: 'tmdb-secret',
      fetcher: fetcher as typeof fetch,
    })
    expect((await response.json()).omdb).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(3)

    const noImdb = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/42?language=zh-TW'))
        return reply({ ...movieDetail, imdb_id: null, runtime: null })
      return providerFetch()(input)
    })
    const second = await handleMediaDetailRequest(request(), {
      tmdbToken: 'tmdb-secret',
      omdbKey: 'omdb-secret',
      fetcher: noImdb as typeof fetch,
    })
    expect((await second.json()).detail).toMatchObject({
      imdb_id: '',
      runtime: 0,
    })
    expect(noImdb).toHaveBeenCalledTimes(3)
  })

  it('bounds a stalled OMDb request and still returns TMDB detail', async () => {
    const fetcher = vi.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        if (!String(input).includes('omdbapi')) return providerFetch()(input)
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new Error('timed out')),
            { once: true },
          )
        })
      },
    )
    const started = Date.now()
    const response = await handleMediaDetailRequest(request(), {
      tmdbToken: 'tmdb-secret',
      omdbKey: 'omdb-secret',
      fetcher: fetcher as typeof fetch,
      warn: vi.fn(),
    })

    expect(response.status).toBe(200)
    expect((await response.json()).omdb).toBeNull()
    expect(Date.now() - started).toBeLessThan(3_000)
  })

  it('distinguishes missing media from provider failures', async () => {
    for (const [upstreamStatus, expectedStatus] of [
      [404, 404],
      [401, 502],
      [429, 502],
    ] as const) {
      const fetcher = vi.fn(async (input: string | URL | Request) =>
        String(input).endsWith('/42?language=zh-TW')
          ? reply({}, upstreamStatus)
          : reply({ cast: [], results: [] }),
      )
      const response = await handleMediaDetailRequest(request(), {
        tmdbToken: 'tmdb-secret',
        fetcher: fetcher as typeof fetch,
      })
      expect(response.status).toBe(expectedStatus)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    }
  })
})
