import { z } from 'zod'

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
export const MAX_MOVIES = 10

export interface CandidateMovie {
  adult?: boolean
  backdrop_path?: string | null
  id: number
  original_language?: string
  original_title?: string
  title: string
  overview: string
  popularity?: number
  poster_path?: string | null
  release_date: string
  video?: boolean
  vote_average: number
  vote_count?: number
  genre_ids: number[]
}

export interface RecommendationRequest {
  answers: Record<string, string>
  movies: CandidateMovie[]
  locale: string
}

export interface ProviderRecommendation {
  movie_id: number
  reason: string
}

export interface NormalizedRecommendation {
  movie_id: number
  reason: string
}

const MOVIE_COUNT_ERROR = `movies must include 1-${MAX_MOVIES} movies`

const candidateMovieSchema = z
  .object({
    adult: z.boolean().optional(),
    backdrop_path: z.string().nullable().optional(),
    id: z.number().int().positive(),
    original_language: z.string().optional(),
    original_title: z.string().optional(),
    title: z.string().trim().min(1),
    overview: z.string(),
    popularity: z.number().finite().optional(),
    poster_path: z.string().nullable().optional(),
    release_date: z.string(),
    video: z.boolean().optional(),
    vote_average: z.number().finite(),
    vote_count: z.number().int().nonnegative().optional(),
    genre_ids: z.array(z.number().int().nonnegative()),
  })
  .strict()

const recommendationRequestSchema = z
  .object({
    answers: z.record(z.string().trim().min(1)),
    movies: z
      .array(candidateMovieSchema)
      .min(1, MOVIE_COUNT_ERROR)
      .max(MAX_MOVIES, MOVIE_COUNT_ERROR),
    locale: z.enum(['zh-TW', 'en']),
  })
  .strict()

const providerRecommendationSchema = z
  .object({
    movie_id: z.number().int().positive(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

const providerRecommendationResponseSchema = z
  .object({
    recommendations: z
      .array(providerRecommendationSchema)
      .min(1)
      .max(MAX_MOVIES),
  })
  .strict()

const DEFAULT_REASON = {
  'zh-TW': '這部片符合你的選片條件。',
  en: 'This movie fits your picker answers.',
}

export function validateRecommendationRequest(
  value: unknown,
): RecommendationRequest {
  const result = recommendationRequestSchema.safeParse(value)

  if (!result.success) {
    const movieCountIssue = result.error.issues.find(
      (issue) => issue.message === MOVIE_COUNT_ERROR,
    )
    throw new Error(movieCountIssue?.message ?? 'request body is invalid')
  }

  return result.data
}

export function parseProviderRecommendationResponse(value: unknown): {
  recommendations: ProviderRecommendation[]
} {
  const result = providerRecommendationResponseSchema.safeParse(value)

  if (!result.success) {
    throw new Error('DeepSeek response has an invalid structure')
  }

  return result.data
}

function limitReason(reason: string, locale: string) {
  const trimmed = reason.trim()
  const maxLength = locale === 'zh-TW' ? 50 : 120

  return Array.from(trimmed).slice(0, maxLength).join('')
}

export function normalizeRecommendations(
  recommendations: ProviderRecommendation[],
  movies: CandidateMovie[],
  locale: string,
) {
  const recommendationByMovieId = new Map<number, string>()

  for (const recommendation of recommendations) {
    if (recommendationByMovieId.has(recommendation.movie_id)) {
      continue
    }

    recommendationByMovieId.set(recommendation.movie_id, recommendation.reason)
  }

  return movies.map((movie) => {
    const reason =
      recommendationByMovieId.get(movie.id) ||
      DEFAULT_REASON[locale === 'zh-TW' ? 'zh-TW' : 'en']

    return {
      movie_id: movie.id,
      reason: limitReason(reason, locale),
    }
  })
}

export function createRecommendationPrompt(request: RecommendationRequest) {
  const outputLanguage =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'

  return [
    {
      role: 'system',
      content: `You write short recommendation reasons for submitted movies only. Return strict JSON with a recommendations array of objects containing movie_id and reason. Return one object for every submitted movie, preserve the submitted order, and do not invent movie ids. Reasons must be 50 Unicode characters or fewer for Traditional Chinese, and 120 characters or fewer for English. Write every reason in ${outputLanguage}. If output_language is Traditional Chinese, use Traditional Chinese wording, not Simplified Chinese. If a movie overview is empty, do not invent plot details.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        locale: request.locale,
        output_language: outputLanguage,
        answers: request.answers,
        movies: request.movies.map((movie) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genre_ids: movie.genre_ids,
        })),
      }),
    },
  ]
}
