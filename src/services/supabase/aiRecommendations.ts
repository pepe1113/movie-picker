import { z } from 'zod'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export interface AiRecommendationRequest {
  answers: AiPickerAnswers
  candidates: Movie[]
  locale: string
  timeoutMs?: number
}

export interface AiRecommendationResponseItem {
  movie_id: number
  reason: string
  movie_snapshot?: Movie
}

export interface AiRecommendationResponse {
  recommendations: AiRecommendationResponseItem[]
  provider?: string
  model?: string
}

const movieSnapshotSchema: z.ZodType<Movie> = z
  .object({
    adult: z.boolean(),
    backdrop_path: z.string().nullable(),
    genre_ids: z.array(z.number().int().nonnegative()),
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

const functionResponseSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({
            movie_id: z.number().int().positive(),
            reason: z.string().trim().min(1).max(120),
            movie_snapshot: movieSnapshotSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
  })
  .strict()

function simplifyCandidate(movie: Movie) {
  return {
    adult: movie.adult,
    backdrop_path: movie.backdrop_path,
    genre_ids: movie.genre_ids,
    id: movie.id,
    original_language: movie.original_language,
    original_title: movie.original_title,
    title: movie.title,
    overview: movie.overview,
    popularity: movie.popularity,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    video: movie.video,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
  }
}

export async function requestAiRecommendations({
  answers,
  candidates,
  locale,
  timeoutMs = 8000,
}: AiRecommendationRequest): Promise<AiRecommendationResponse> {
  const submittedCandidates = candidates.slice(0, 10)
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'recommend-movies',
    {
      body: {
        answers,
        movies: submittedCandidates.map(simplifyCandidate),
        locale,
      },
      timeout: timeoutMs,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  const expectedMovieIds = submittedCandidates.map((movie) => movie.id)
  const result = functionResponseSchema
    .superRefine((response, context) => {
      const responseMovieIds = response.recommendations.map(
        (recommendation) => recommendation.movie_id,
      )
      const matchesSubmittedOrder =
        responseMovieIds.length === expectedMovieIds.length &&
        responseMovieIds.every(
          (movieId, index) => movieId === expectedMovieIds[index],
        )

      if (!matchesSubmittedOrder) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'recommendations must match every submitted movie in submitted order',
          path: ['recommendations'],
        })
      }
    })
    .safeParse(data)
  if (!result.success) {
    throw new Error('AI recommendation response has an invalid structure')
  }

  return result.data
}
