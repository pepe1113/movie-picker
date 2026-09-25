import type { MediaItem, MediaType } from '@/services/tmdb/types'

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

export interface QueryPlanSnapshot {
  schema_version: 1
  hard_constraints: {
    exclude_genres: string[]
    exclude_keywords: Array<{
      lookup_name: string
      display_label: string
    }>
    runtime_min: number | null
    runtime_max: number | null
    release_year_min: number | null
    release_year_max: number | null
    original_language: string | null
    origin_country: string | null
  }
  soft_preferences: {
    include_genres: Array<{
      name: string
      source: 'explicit' | 'inferred'
    }>
    keywords: Array<{
      lookup_name: string
      display_label: string
      source: 'explicit' | 'inferred'
    }>
    qualities: string[]
  }
  people: Array<{
    id: number
    name: string
    role: 'cast' | 'director' | 'writer' | 'producer'
  }>
  people_match: 'any' | 'all'
}

export interface ContextRecommendationResponse {
  media_type: MediaType
  query_plan?: QueryPlanSnapshot
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
