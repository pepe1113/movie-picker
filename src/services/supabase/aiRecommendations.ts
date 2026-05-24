import type { AiPickerAnswers } from '@/utils/aiMoviePicker'
import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export interface AiRecommendationRequest {
  answers: AiPickerAnswers
  candidates: Movie[]
  locale: string
}

export interface AiRecommendationResponseItem {
  movie_id: number
  reason: string
  movie_snapshot?: Movie
}

interface FunctionResponse {
  recommendations?: AiRecommendationResponseItem[]
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
}: AiRecommendationRequest) {
  const { data, error } = await getSupabaseClient().functions.invoke<FunctionResponse>(
    'recommend-movies',
    {
      body: {
        answers,
        candidates: candidates.slice(0, 20).map(simplifyCandidate),
        locale,
      },
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return data?.recommendations ?? []
}
