import { describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/services/tmdb/types'
import {
  resolveAiPickerRecommendations,
  type RemoteAiRecommendation,
} from '@/utils/aiRecommendationFlow'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'

function movie(id: number, title = `Movie ${id}`): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [28],
    id,
    original_language: 'en',
    original_title: title,
    overview: 'Overview',
    popularity: 10,
    poster_path: null,
    release_date: '2026-01-01',
    title,
    video: false,
    vote_average: 8,
    vote_count: 100,
  }
}

const answers: AiPickerAnswers = {
  mood: 'exciting',
  occasion: 'friends',
  pace: 'fast',
  era: 'recent',
}

describe('AI recommendation flow', () => {
  it('uses remote AI recommendations for authenticated users', async () => {
    const remoteRecommendations: RemoteAiRecommendation[] = [
      { movie_id: 2, reason: '很適合今晚和朋友一起看' },
      { movie_id: 1, reason: '開場節奏明快' },
    ]
    const requestRemoteRecommendations = vi
      .fn()
      .mockResolvedValue({
        recommendations: remoteRecommendations,
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      })

    const result = await resolveAiPickerRecommendations({
      answers,
      candidates: [movie(1), movie(2)],
      isAuthenticated: true,
      locale: 'zh-TW',
      requestRemoteRecommendations,
    })

    expect(requestRemoteRecommendations).toHaveBeenCalled()
    expect(result.usedFallback).toBe(false)
    expect(result.provider).toBe('deepseek')
    expect(result.model).toBe('deepseek-v4-flash')
    expect(result.recommendations).toEqual([
      {
        movie: movie(1),
        reason: '開場節奏明快',
        matchedKeywordKeys: [],
      },
      {
        movie: movie(2),
        reason: '很適合今晚和朋友一起看',
        matchedKeywordKeys: [],
      },
    ])
  })

  it('keeps candidate poster data when remote recommendations include a partial snapshot', async () => {
    const candidate = movie(2)
    candidate.poster_path = '/poster.jpg'
    const remoteRecommendations: RemoteAiRecommendation[] = [
      {
        movie_id: 2,
        reason: '很適合今晚和朋友一起看',
        movie_snapshot: {
          id: 2,
          title: 'Movie 2',
          overview: 'AI overview',
          release_date: '2026-01-01',
          vote_average: 8,
          genre_ids: [28],
        } as Movie,
      },
    ]

    const result = await resolveAiPickerRecommendations({
      answers,
      candidates: [movie(1), candidate],
      isAuthenticated: true,
      locale: 'zh-TW',
      requestRemoteRecommendations: vi
        .fn()
        .mockResolvedValue({ recommendations: remoteRecommendations }),
    })

    expect(
      result.recommendations.find((item) => item.movie.id === 2)?.movie
        .poster_path,
    ).toBe('/poster.jpg')
  })

  it('does not call remote AI recommendations for unauthenticated users', async () => {
    const requestRemoteRecommendations = vi.fn()

    const result = await resolveAiPickerRecommendations({
      answers,
      candidates: [movie(1), movie(2)],
      isAuthenticated: false,
      locale: 'en',
      requestRemoteRecommendations,
    })

    expect(requestRemoteRecommendations).not.toHaveBeenCalled()
    expect(result.usedFallback).toBe(true)
    expect(result.recommendations.map((item) => item.movie.id)).toEqual([1, 2])
  })

  it('falls back to rule-based recommendations when remote AI fails', async () => {
    const result = await resolveAiPickerRecommendations({
      answers,
      candidates: [movie(1), movie(2)],
      isAuthenticated: true,
      locale: 'zh-TW',
      requestRemoteRecommendations: vi
        .fn()
        .mockRejectedValue(new Error('provider unavailable')),
    })

    expect(result.usedFallback).toBe(true)
    expect(result.recommendations.map((item) => item.movie.id)).toEqual([1, 2])
  })

  it('keeps every submitted movie when a remote reason is missing', async () => {
    const result = await resolveAiPickerRecommendations({
      answers,
      candidates: [movie(1), movie(2), movie(3)],
      isAuthenticated: true,
      locale: 'zh-TW',
      requestRemoteRecommendations: vi.fn().mockResolvedValue({
        recommendations: [{ movie_id: 2, reason: '很適合今晚' }],
      }),
    })

    expect(result.usedFallback).toBe(false)
    expect(result.recommendations.map((item) => item.movie.id)).toEqual([
      1, 2, 3,
    ])
    expect(result.recommendations.map((item) => item.reason)).toEqual([
      undefined,
      '很適合今晚',
      undefined,
    ])
  })
})
