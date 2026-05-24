export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
export const MAX_CANDIDATES = 20
export const MAX_RECOMMENDATIONS = 3

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
  candidates: CandidateMovie[]
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

export function validateRecommendationRequest(
  value: unknown,
): RecommendationRequest {
  if (!value || typeof value !== 'object') {
    throw new Error('request body must be an object')
  }

  const request = value as Partial<RecommendationRequest>

  if (!request.answers || typeof request.answers !== 'object') {
    throw new Error('answers are required')
  }

  if (
    !Array.isArray(request.candidates) ||
    request.candidates.length === 0 ||
    request.candidates.length > MAX_CANDIDATES
  ) {
    throw new Error(`candidates must include 1-${MAX_CANDIDATES} movies`)
  }

  if (typeof request.locale !== 'string' || request.locale.length === 0) {
    throw new Error('locale is required')
  }

  return {
    answers: request.answers,
    candidates: request.candidates,
    locale: request.locale,
  }
}

export function normalizeRecommendations(
  recommendations: ProviderRecommendation[],
  candidateIds: Set<number>,
) {
  const normalized: NormalizedRecommendation[] = []

  for (const recommendation of recommendations) {
    if (
      !candidateIds.has(recommendation.movie_id) ||
      normalized.some((item) => item.movie_id === recommendation.movie_id)
    ) {
      continue
    }

    normalized.push({
      movie_id: recommendation.movie_id,
      reason:
        recommendation.reason.trim() ||
        'Recommended from your selected candidates.',
    })

    if (normalized.length >= MAX_RECOMMENDATIONS) break
  }

  return normalized
}

export function createRecommendationPrompt(request: RecommendationRequest) {
  const outputLanguage =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'

  return [
    {
      role: 'system',
      content:
        `You rerank submitted movie candidates only. Return strict JSON with a recommendations array of objects containing movie_id and reason. Do not invent movie ids. Write every reason in ${outputLanguage}. If output_language is Traditional Chinese, use Traditional Chinese wording, not Simplified Chinese.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        locale: request.locale,
        output_language: outputLanguage,
        answers: request.answers,
        candidates: request.candidates.map((movie) => ({
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
