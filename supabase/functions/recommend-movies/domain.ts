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

const DEFAULT_REASON = {
  'zh-TW': '這部片符合你的選片條件。',
  en: 'This movie fits your picker answers.',
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
    !Array.isArray(request.movies) ||
    request.movies.length === 0 ||
    request.movies.length > MAX_MOVIES
  ) {
    throw new Error(`movies must include 1-${MAX_MOVIES} movies`)
  }

  if (typeof request.locale !== 'string' || request.locale.length === 0) {
    throw new Error('locale is required')
  }

  return {
    answers: request.answers,
    movies: request.movies,
    locale: request.locale,
  }
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
      content:
        `You write short recommendation reasons for submitted movies only. Return strict JSON with a recommendations array of objects containing movie_id and reason. Return one object for every submitted movie, preserve the submitted order, and do not invent movie ids. Reasons must be 50 Unicode characters or fewer for Traditional Chinese, and 120 characters or fewer for English. Write every reason in ${outputLanguage}. If output_language is Traditional Chinese, use Traditional Chinese wording, not Simplified Chinese. If a movie overview is empty, do not invent plot details.`,
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
