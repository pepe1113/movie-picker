import { describe, expect, it, vi } from 'vitest'
import type {
  CandidateMedia,
  ContextPlan,
} from '../../supabase/functions/recommend-movies/domain'
import {
  parseJevAnswer,
  rerankCandidates,
} from '../../supabase/functions/recommend-movies/rerank'

const plan: ContextPlan = {
  intent_summary: '尋找能激勵工作的電影',
  hard_constraints: {
    exclude_genre_ids: [],
    exclude_keywords: [],
  },
  soft_preferences: {
    include_genres: [{ id: 18, source: 'inferred' }],
    keywords: [
      {
        lookup_name: 'career',
        display_label: '職涯',
        source: 'inferred',
      },
    ],
    qualities: ['激勵'],
  },
  people: [],
  people_match: 'any',
  display_labels: { hard: [], soft: ['激勵', '職涯'] },
  discover_plan: {
    include_genres: [{ id: 18, source: 'inferred' }],
    exclude_genre_ids: [],
    exclude_keywords: [],
    keywords: [
      {
        lookup_name: 'career',
        display_label: '職涯',
        source: 'inferred',
      },
    ],
  },
}

function movie(id: number): CandidateMedia {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [18],
    id,
    media_type: 'movie',
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

function answer(score: number, model = 'typesafe/jev-1.13-20260917') {
  return new Response(
    JSON.stringify({
      answers: { is_relevant: { type: 'noul', noul: score } },
      model,
      usage: { cost: 0.00001 },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

describe('OpenRouter Jev candidate reranking', () => {
  it('validates only finite 0-1 noul answers for the expected question', () => {
    expect(
      parseJevAnswer({
        answers: { is_relevant: { type: 'noul', noul: 0.75 } },
        model: 'typesafe/jev-1.13-20260917',
        usage: { cost: 0.01 },
      }),
    ).toEqual({
      score: 0.75,
      model: 'typesafe/jev-1.13-20260917',
      cost: 0.01,
    })

    for (const value of [
      {},
      { answers: { wrong_id: { type: 'noul', noul: 0.8 } } },
      { answers: { is_relevant: { type: 'score', noul: 0.8 } } },
      { answers: { is_relevant: { type: 'noul', noul: '0.8' } } },
      { answers: { is_relevant: { type: 'noul', noul: Number.NaN } } },
      { answers: { is_relevant: { type: 'noul', noul: Infinity } } },
      { answers: { is_relevant: { type: 'noul', noul: -0.1 } } },
      { answers: { is_relevant: { type: 'noul', noul: 1.1 } } },
    ]) {
      expect(() =>
        parseJevAnswer({ ...value, model: 'typesafe/jev-1.13' }),
      ).toThrow('OpenRouter Decisions response is invalid')
    }
  })

  it('sorts passing candidates, preserves ties, and returns at most five input members', async () => {
    const candidates = Array.from({ length: 7 }, (_, index) => movie(index + 1))
    const scores = [0.5, 0.9, 0.9, 0.4, 0.8, 0.7, 0.6]
    const requests: Array<Record<string, unknown>> = []
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return answer(scores[requests.length - 1]!)
    })

    const result = await rerankCandidates(
      candidates,
      plan,
      plan.soft_preferences.keywords.map((keyword, index) => ({
        ...keyword,
        id: index + 1,
      })),
      'secret',
      new AbortController().signal,
      fetcher,
    )

    expect(result.candidates.map(({ id }) => id)).toEqual([2, 3, 5, 6, 7])
    expect(result.fullFallback).toBe(false)
    expect(result.model).toBe('typesafe/jev-1.13-20260917')
    expect(requests[0]).toMatchObject({
      model: 'typesafe/jev-1.13',
      state: {
        direction: {
          summary: '尋找能激勵工作的電影',
          qualities: ['激勵'],
          keywords: ['職涯'],
        },
        candidate: {
          id: 1,
          title: 'Movie 1',
          genres: ['drama'],
          year: '2026',
        },
      },
    })
    expect(JSON.stringify(requests[0])).not.toContain('popularity')
    expect(JSON.stringify(requests[0])).not.toContain('vote_average')
  })

  it('keeps valid passing results when sibling decisions fail', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      const id = Number(
        (
          JSON.parse(String(init?.body)) as {
            state: { candidate: { id: number } }
          }
        ).state.candidate.id,
      )
      if (id === 1) return answer(0.8)
      if (id === 2) return new Response('rate limited', { status: 429 })
      return new Response('{', { status: 200 })
    })

    const result = await rerankCandidates(
      [movie(1), movie(2), movie(3)],
      plan,
      [],
      'secret',
      new AbortController().signal,
      fetcher,
    )

    expect(result.candidates.map(({ id }) => id)).toEqual([1])
    expect(result.fullFallback).toBe(false)
  })

  it('returns an empty result when valid answers all fall below the threshold', async () => {
    const result = await rerankCandidates(
      [movie(1), movie(2)],
      plan,
      [],
      'secret',
      new AbortController().signal,
      vi.fn<typeof fetch>().mockImplementation(async () => answer(0.49)),
    )

    expect(result.candidates).toEqual([])
    expect(result.fullFallback).toBe(false)
  })

  it.each([
    ['401', () => new Response('{}', { status: 401 })],
    ['402', () => new Response('{}', { status: 402 })],
    ['413', () => new Response('{}', { status: 413 })],
    ['429', () => new Response('{}', { status: 429 })],
    ['5xx', () => new Response('{}', { status: 503 })],
    ['invalid JSON', () => new Response('{', { status: 200 })],
    [
      'missing answer',
      () =>
        new Response(
          JSON.stringify({
            answers: {},
            model: 'typesafe/jev-1.13-20260917',
          }),
        ),
    ],
    [
      'timeout',
      () => Promise.reject(new DOMException('Timed out', 'TimeoutError')),
    ],
  ])('falls back safely after %s responses', async (_label, response) => {
    const result = await rerankCandidates(
      [movie(1), movie(2)],
      plan,
      [],
      'secret',
      new AbortController().signal,
      vi.fn<typeof fetch>().mockImplementation(async () => response()),
    )

    expect(result.candidates.map(({ id }) => id)).toEqual([1, 2])
    expect(result.fullFallback).toBe(true)
  })

  it('falls back to the first five candidates when every decision fails', async () => {
    const controller = new AbortController()
    controller.abort(new Error('deadline exceeded'))
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.signal).toBe(controller.signal)
      throw new DOMException('Aborted', 'AbortError')
    })

    const result = await rerankCandidates(
      Array.from({ length: 7 }, (_, index) => movie(index + 1)),
      plan,
      [],
      'secret',
      controller.signal,
      fetcher,
    )

    expect(result.candidates.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5])
    expect(result.fullFallback).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(7)
  })
})
