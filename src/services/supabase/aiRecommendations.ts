import { z } from 'zod'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export const MAX_MOVIE_REQUEST_LENGTH = 500
export const RECOMMENDATION_DEADLINE_MS = 10_000

export interface ContextRecommendation {
  movie_id: number
  reason?: string
  kind: 'primary' | 'wildcard'
  movie_snapshot: Movie
}

export interface ContextRecommendationResponse {
  direction: {
    summary: string
    labels: Array<{
      text: string
      kind: 'hard' | 'soft'
    }>
  }
  recommendations: ContextRecommendation[]
  provider: 'openrouter'
  model: string
  used_fallback: boolean
}

const movieSchema: z.ZodType<Movie> = z
  .object({
    adult: z.boolean(),
    backdrop_path: z.string().nullable(),
    genre_ids: z.array(z.number().int()),
    id: z.number().int().positive(),
    original_language: z.string(),
    original_title: z.string(),
    overview: z.string(),
    popularity: z.number().finite(),
    poster_path: z.string().nullable(),
    release_date: z.string(),
    title: z.string().min(1),
    video: z.boolean(),
    vote_average: z.number().finite(),
    vote_count: z.number().int().nonnegative(),
  })
  .strict()

const responseSchema: z.ZodType<ContextRecommendationResponse> = z
  .object({
    direction: z
      .object({
        summary: z.string().trim().min(1),
        labels: z.array(
          z
            .object({
              text: z.string().trim().min(1),
              kind: z.enum(['hard', 'soft']),
            })
            .strict(),
        ),
      })
      .strict(),
    recommendations: z
      .array(
        z
          .object({
            movie_id: z.number().int().positive(),
            reason: z.string().trim().min(1).optional(),
            kind: z.enum(['primary', 'wildcard']),
            movie_snapshot: movieSchema,
          })
          .strict(),
      )
      .max(5),
    provider: z.literal('openrouter'),
    model: z.string().min(1),
    used_fallback: z.boolean(),
  })
  .strict()

export async function requestContextRecommendations(
  request: string,
  locale: 'zh-TW' | 'en',
  signal?: AbortSignal,
): Promise<ContextRecommendationResponse> {
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'recommend-movies',
    {
      body: { request: request.trim(), locale },
      signal,
      timeout: RECOMMENDATION_DEADLINE_MS,
    },
  )

  if (error) throw new Error(error.message)

  const result = responseSchema.safeParse(data)
  if (!result.success) {
    throw new Error('AI recommendation response has an invalid structure')
  }
  return result.data
}
