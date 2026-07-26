import { describe, expect, it } from 'vitest'
import {
  createMovieCriteriaPrompt,
  parseMovieCriteriaResponse,
  validateMovieRequest,
} from '../../supabase/functions/analyze-movie-request/domain'

describe('analyze-movie-request edge function domain', () => {
  it('validates and trims a user movie request', () => {
    expect(
      validateMovieRequest({
        request: '  想看溫暖的近年電影  ',
        locale: 'zh-TW',
      }),
    ).toEqual({
      request: '想看溫暖的近年電影',
      locale: 'zh-TW',
    })
  })

  it('rejects empty, oversized, and unsupported locale requests', () => {
    expect(() =>
      validateMovieRequest({ request: ' ', locale: 'zh-TW' }),
    ).toThrow('movie request is invalid')
    expect(() =>
      validateMovieRequest({ request: 'a'.repeat(501), locale: 'zh-TW' }),
    ).toThrow('movie request is invalid')
    expect(() =>
      validateMovieRequest({ request: 'movie', locale: 'ja' }),
    ).toThrow('movie request is invalid')
  })

  it('accepts only the supported structured criteria', () => {
    expect(
      parseMovieCriteriaResponse({
        criteria: {
          mood: 'relaxed',
          occasion: 'date',
          pace: 'immersive',
          era: 'recent',
        },
      }),
    ).toEqual({
      criteria: {
        mood: 'relaxed',
        occasion: 'date',
        pace: 'immersive',
        era: 'recent',
      },
    })

    expect(() =>
      parseMovieCriteriaResponse({
        criteria: {
          mood: 'cozy',
          occasion: 'date',
          pace: 'immersive',
          era: 'recent',
        },
      }),
    ).toThrow('DeepSeek criteria response has an invalid structure')
  })

  it('prompts DeepSeek to return criteria without movie titles', () => {
    const prompt = createMovieCriteriaPrompt({
      request: '想和朋友看刺激的新電影',
      locale: 'zh-TW',
    })

    expect(prompt[0].content).toContain('strict JSON')
    expect(prompt[0].content).toContain('Never add fields or movie titles')
    expect(prompt[1].content).toContain('想和朋友看刺激的新電影')
  })
})
