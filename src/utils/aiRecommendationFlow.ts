import type { Movie } from '@/services/tmdb/types'
import {
  requestAiRecommendations,
  type AiRecommendationResponse,
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
  provider?: string
  model?: string
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
  ) => Promise<AiRecommendationResponse>
}

function toRemoteDisplayRecommendations(
  remoteRecommendations: RemoteAiRecommendation[],
  candidates: Movie[],
) {
  const recommendationByMovieId = new Map(
    remoteRecommendations.map((recommendation) => [
      recommendation.movie_id,
      recommendation,
    ]),
  )

  return candidates.reduce<AiPickerDisplayRecommendation[]>(
    (displayRecommendations, candidate) => {
      const recommendation = recommendationByMovieId.get(candidate.id)

      const movie = recommendation?.movie_snapshot
        ? ({ ...candidate, ...recommendation.movie_snapshot } as Movie)
        : candidate

      displayRecommendations.push({
        movie,
        reason: recommendation?.reason,
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
  const fallbackKeywordKeys =
    recommendMovies(candidates, answers)[0]?.matchedKeywordKeys ?? []

  return candidates.map((movie) => ({
    movie,
    matchedKeywordKeys: fallbackKeywordKeys,
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
    const remoteResult = await requestRemoteRecommendations({
      answers,
      candidates,
      locale,
    })
    const recommendations = toRemoteDisplayRecommendations(
      remoteResult.recommendations,
      candidates,
    )

    if (recommendations.length === 0) {
      throw new Error('AI recommendations were empty')
    }

    return {
      recommendations,
      usedFallback: false,
      provider: remoteResult.provider,
      model: remoteResult.model,
    }
  } catch {
    return {
      recommendations: getFallbackRecommendations(candidates, answers),
      usedFallback: true,
    }
  }
}
