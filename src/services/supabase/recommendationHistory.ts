import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export interface RecommendationRunItem {
  movie_id: number
  reason: string
  movie_snapshot: Movie
}

export interface RecommendationRun {
  id: string
  answers: Record<string, string>
  recommendations: RecommendationRunItem[]
  provider: string
  model: string
  created_at: string
}

export interface RecommendationHistoryRemote {
  listLatest: (userId: string) => Promise<RecommendationRun[]>
  deleteRun: (userId: string, runId: string) => Promise<void>
  createRun: (input: {
    userId: string
    answers: Record<string, string>
    candidateMovieIds: number[]
    recommendations: RecommendationRunItem[]
    provider: string
    model: string
  }) => Promise<void>
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export const supabaseRecommendationHistoryRemote: RecommendationHistoryRemote =
  {
    async listLatest(userId) {
      const { data, error } = await getSupabaseClient()
        .from('ai_recommendation_runs')
        .select('id, answers, recommendations, provider, model, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      throwIfSupabaseError(error)

      return (data ?? []) as RecommendationRun[]
    },

    async deleteRun(userId, runId) {
      const { error } = await getSupabaseClient()
        .from('ai_recommendation_runs')
        .delete()
        .eq('user_id', userId)
        .eq('id', runId)

      throwIfSupabaseError(error)
    },

    async createRun({
      userId,
      answers,
      candidateMovieIds,
      recommendations,
      provider,
      model,
    }) {
      const { error } = await getSupabaseClient()
        .from('ai_recommendation_runs')
        .insert({
          user_id: userId,
          answers,
          candidate_movie_ids: candidateMovieIds,
          recommendations,
          provider,
          model,
        })

      throwIfSupabaseError(error)
    },
  }

let recommendationHistoryRemote = supabaseRecommendationHistoryRemote

export function setRecommendationHistoryRemoteForTesting(
  remote: RecommendationHistoryRemote | null,
) {
  recommendationHistoryRemote = remote ?? supabaseRecommendationHistoryRemote
}

export function getRecommendationHistoryRemote() {
  return recommendationHistoryRemote
}
