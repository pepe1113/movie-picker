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

interface FunctionResponse {
  recommendations?: AiRecommendationResponseItem[]
  provider?: string
  model?: string
}

export interface AiRecommendationResponse {
  recommendations: AiRecommendationResponseItem[]
  provider?: string
  model?: string
}

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
  const { data, error } = await getSupabaseClient().functions.invoke<FunctionResponse>(
    'recommend-movies',
    {
      body: {
        answers,
        movies: candidates.slice(0, 10).map(simplifyCandidate),
        locale,
      },
      timeout: timeoutMs,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return {
    recommendations: data?.recommendations ?? [],
    provider: data?.provider,
    model: data?.model,
  }
}
