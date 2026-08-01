import { z } from 'zod'
import type { MediaItem, MediaType } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export const MAX_MOVIE_REQUEST_LENGTH = 500
export const RECOMMENDATION_DEADLINE_MS = 31_000

export type RecommendationErrorCode =
  | 'media_type_mismatch'
  | 'unresolved_person'
  | 'unresolved_keyword'
  | 'unknown'

export class RecommendationRequestError extends Error {
  code: RecommendationErrorCode
  condition?: string

  constructor(code: RecommendationErrorCode, condition?: string) {
    super(code)
    this.code = code
    this.condition = condition
  }
}

export interface ContextRecommendation {
  media_id: number
  reason?: string
  kind: 'primary' | 'wildcard'
  media_snapshot: MediaItem
}

export interface ContextRecommendationResponse {
  media_type: MediaType
  direction: {
    summary: string
    labels: Array<{
      text: string
      kind: 'hard' | 'soft'
    }>
  }
  recommendations: ContextRecommendation[]
  provider: 'openai'
  model: string
  used_fallback: boolean
}

const mediaBase = {
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number().int()),
  id: z.number().int().positive(),
  original_language: z.string(),
  overview: z.string(),
  popularity: z.number().finite(),
  poster_path: z.string().nullable(),
  vote_average: z.number().finite(),
  vote_count: z.number().int().nonnegative(),
}

const movieSchema = z
  .object({
    ...mediaBase,
    media_type: z.literal('movie'),
    original_title: z.string(),
    release_date: z.string(),
    title: z.string().min(1),
    video: z.boolean(),
  })
  .strict()

const tvSchema = z
  .object({
    ...mediaBase,
    first_air_date: z.string(),
    media_type: z.literal('tv'),
    name: z.string().min(1),
    origin_country: z.array(z.string()),
    original_name: z.string(),
  })
  .strict()

const responseSchema: z.ZodType<ContextRecommendationResponse> = z
  .object({
    media_type: z.enum(['movie', 'tv']),
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
            media_id: z.number().int().positive(),
            reason: z.string().trim().min(1).optional(),
            kind: z.enum(['primary', 'wildcard']),
            media_snapshot: z.discriminatedUnion('media_type', [
              movieSchema,
              tvSchema,
            ]),
          })
          .strict(),
      )
      .max(10),
    provider: z.literal('openai'),
    model: z.string().min(1),
    used_fallback: z.boolean(),
  })
  .strict()

async function parseFunctionError(error: unknown) {
  const context =
    typeof error === 'object' && error !== null && 'context' in error
      ? error.context
      : undefined
  if (context instanceof Response) {
    const payload = (await context
      .clone()
      .json()
      .catch(() => null)) as {
      error?: unknown
      condition?: unknown
    } | null
    if (
      payload &&
      (payload.error === 'media_type_mismatch' ||
        payload.error === 'unresolved_person' ||
        payload.error === 'unresolved_keyword')
    ) {
      return new RecommendationRequestError(
        payload.error,
        typeof payload.condition === 'string' ? payload.condition : undefined,
      )
    }
  }
  return new RecommendationRequestError('unknown')
}

export async function requestContextRecommendations(
  request: string,
  locale: 'zh-TW' | 'en',
  mediaType: MediaType,
  signal?: AbortSignal,
): Promise<ContextRecommendationResponse> {
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'recommend-movies',
    {
      body: { request: request.trim(), locale, media_type: mediaType },
      signal,
      timeout: RECOMMENDATION_DEADLINE_MS,
    },
  )

  if (error) throw await parseFunctionError(error)

  const result = responseSchema.safeParse(data)
  if (!result.success) {
    throw new Error('AI recommendation response has an invalid structure')
  }
  return result.data
}
