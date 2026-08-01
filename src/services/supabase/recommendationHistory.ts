import type { MediaItem, MediaType } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

export interface RecommendationRunItem {
  media_id: number
  reason?: string
  kind: 'primary' | 'wildcard'
  media_snapshot: MediaItem
}

export interface RecommendationRun {
  id: string
  media_type: MediaType
  intent: {
    summary: string
    hard_constraints: Record<string, unknown>
    soft_preferences: Record<string, unknown>
    display_labels: {
      hard: string[]
      soft: string[]
    }
  }
  discover_plan: Record<string, unknown>
  recommendations: RecommendationRunItem[]
  provider: string
  model: string
  created_at: string
}

export interface RecommendationHistoryRemote {
  listLatest: (userId: string) => Promise<RecommendationRun[]>
  deleteRun: (userId: string, runId: string) => Promise<void>
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
        .select(
          'id, media_type, intent, discover_plan, recommendations, provider, model, created_at',
        )
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
