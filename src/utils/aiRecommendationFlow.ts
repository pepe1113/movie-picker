import type { Movie } from '@/services/tmdb/types'
import {
  requestAiRecommendations,
  type AiRecommendationResponseItem,
} from '@/services/supabase/aiRecommendations'
import {
  recommendMovies,
  type AiMovieRecommendation,
  type AiPickerAnswers,
} from './aiMoviePicker'

export type RemoteAiRecommendation = AiRecommendationResponseItem

export interface AiPickerDisplayRecommendation extends AiMovieRecommendation {
  reason?: string
}

export interface AiPickerRecommendationResult {
  recommendations: AiPickerDisplayRecommendation[]
  usedFallback: boolean
}

interface ResolveAiPickerRecommendationsInput {
  answers: AiPickerAnswers
  candidates: Movie[]
  isAuthenticated: boolean
  locale: string
  requestRemoteRecommendations?: (
    input: {
      answers: AiPickerAnswers
      candidates: Movie[]
      locale: string
    },
  ) => Promise<RemoteAiRecommendation[]>
}

function toRemoteDisplayRecommendations(
  remoteRecommendations: RemoteAiRecommendation[],
  candidates: Movie[],
) {
  const movieById = new Map(candidates.map((movie) => [movie.id, movie]))

  return remoteRecommendations.reduce<AiPickerDisplayRecommendation[]>(
    (displayRecommendations, recommendation) => {
      const candidate = movieById.get(recommendation.movie_id)
      const movie = recommendation.movie_snapshot
        ? ({ ...candidate, ...recommendation.movie_snapshot } as Movie)
        : candidate

      if (!movie) return displayRecommendations

      displayRecommendations.push({
        movie,
        reason: recommendation.reason,
        matchedKeywordKeys: [],
      })

      return displayRecommendations
    },
    [],
  )
}

function getFallbackRecommendations(
  candidates: Movie[],
  answers: AiPickerAnswers,
) {
  return recommendMovies(candidates, answers).map((recommendation) => ({
    ...recommendation,
    reason: undefined,
  }))
}

export async function resolveAiPickerRecommendations({
  answers,
  candidates,
  isAuthenticated,
  locale,
  requestRemoteRecommendations = requestAiRecommendations,
}: ResolveAiPickerRecommendationsInput): Promise<AiPickerRecommendationResult> {
  if (!isAuthenticated) {
    return {
      recommendations: getFallbackRecommendations(candidates, answers),
      usedFallback: true,
    }
  }

  try {
    const remoteRecommendations = await requestRemoteRecommendations({
      answers,
      candidates,
      locale,
    })
    const recommendations = toRemoteDisplayRecommendations(
      remoteRecommendations,
      candidates,
    )

    if (recommendations.length === 0) {
      throw new Error('AI recommendations were empty')
    }

    return {
      recommendations,
      usedFallback: false,
    }
  } catch {
    return {
      recommendations: getFallbackRecommendations(candidates, answers),
      usedFallback: true,
    }
  }
}
