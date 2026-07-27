import { z } from 'zod'

export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_OPENROUTER_MODEL = 'inclusionai/ling-3.0-flash:free'
export const MAX_MOVIE_REQUEST_LENGTH = 500
export const MAX_CANDIDATES = 20
export const MAX_RECOMMENDATIONS = 5

export const TMDB_MOVIE_GENRE_IDS = [
  12, 14, 16, 18, 27, 28, 35, 36, 37, 53, 80, 99, 878, 9648, 10402, 10749,
  10751, 10752, 10770,
] as const

const genreIds = new Set<number>(TMDB_MOVIE_GENRE_IDS)
const genreIdSchema = z
  .number()
  .int()
  .refine((value) => genreIds.has(value), 'genre id is not allowed')
const labelSchema = z.string().trim().min(1).max(40)

export const recommendationRequestSchema = z
  .object({
    request: z.string().trim().min(2).max(MAX_MOVIE_REQUEST_LENGTH),
    locale: z.enum(['zh-TW', 'en']),
  })
  .strict()

export const hardConstraintsSchema = z
  .object({
    exclude_genre_ids: z.array(genreIdSchema).max(3).default([]),
    runtime_max: z.number().int().min(30).max(360).optional(),
    release_year_min: z.number().int().min(1870).max(2100).optional(),
    release_year_max: z.number().int().min(1870).max(2100).optional(),
    original_language: z
      .string()
      .regex(/^[a-z]{2}$/)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.release_year_min &&
      value.release_year_max &&
      value.release_year_min > value.release_year_max
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'release year minimum cannot exceed maximum',
      })
    }
  })

export const softPreferencesSchema = z
  .object({
    include_genre_ids: z.array(genreIdSchema).max(3).default([]),
    keyword_names: z.array(z.string().trim().min(1).max(50)).max(2).default([]),
    qualities: z.array(labelSchema).max(3).default([]),
  })
  .strict()

const providerPlanSchema = z
  .object({
    intent_summary: z.string().trim().min(1).max(200),
    hard_constraints: hardConstraintsSchema,
    soft_preferences: softPreferencesSchema,
    display_labels: z
      .object({
        hard: z.array(labelSchema).max(6),
        soft: z.array(labelSchema).max(3),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const hard = value.hard_constraints
    const expectedHardLabels =
      hard.exclude_genre_ids.length +
      Number(hard.runtime_max !== undefined) +
      Number(
        hard.release_year_min !== undefined ||
          hard.release_year_max !== undefined,
      ) +
      Number(hard.original_language !== undefined)

    if (value.display_labels.hard.length < expectedHardLabels) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'every hard constraint requires a display label',
        path: ['display_labels', 'hard'],
      })
    }
    if (
      value.soft_preferences.qualities.length > 0 &&
      value.display_labels.soft.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'important soft preferences require display labels',
        path: ['display_labels', 'soft'],
      })
    }
  })

export const movieSchema = z
  .object({
    adult: z.boolean(),
    backdrop_path: z.string().nullable(),
    genre_ids: z.array(z.number().int()),
    id: z.number().int().positive(),
    original_language: z.string(),
    original_title: z.string(),
    overview: z.string(),
    popularity: z.number().finite(),
    poster_path: z.string().nullable(),
    release_date: z.string(),
    title: z.string().trim().min(1),
    video: z.boolean(),
    vote_average: z.number().finite(),
    vote_count: z.number().int().nonnegative(),
  })
  .strict()

const movieListSchema = z
  .object({
    results: z.array(movieSchema),
  })
  .passthrough()

const keywordSearchSchema = z
  .object({
    results: z.array(
      z
        .object({
          id: z.number().int().positive(),
          name: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>
export type HardConstraints = z.infer<typeof hardConstraintsSchema>
export type SoftPreferences = z.infer<typeof softPreferencesSchema>
export type CandidateMovie = z.infer<typeof movieSchema>

export interface DiscoverPlan {
  include_genre_ids: number[]
  exclude_genre_ids: number[]
  keyword_names: string[]
  runtime_max?: number
  release_year_min?: number
  release_year_max?: number
  original_language?: string
}

export interface ContextPlan {
  intent_summary: string
  hard_constraints: HardConstraints
  soft_preferences: SoftPreferences
  display_labels: {
    hard: string[]
    soft: string[]
  }
  discover_plan: DiscoverPlan
}

export interface RankedRecommendation {
  movie_id: number
  reason: string
  kind: 'primary' | 'wildcard'
}

export function validateRecommendationRequest(
  value: unknown,
): RecommendationRequest {
  const result = recommendationRequestSchema.safeParse(value)
  if (!result.success) throw new Error('movie request is invalid')
  return result.data
}

export function parseContextPlan(value: unknown): ContextPlan {
  const result = providerPlanSchema.safeParse(value)
  if (!result.success) throw new Error('query plan has an invalid structure')

  const { hard_constraints: hard, soft_preferences: soft } = result.data
  return {
    ...result.data,
    discover_plan: {
      include_genre_ids: soft.include_genre_ids,
      exclude_genre_ids: hard.exclude_genre_ids,
      keyword_names: soft.keyword_names,
      runtime_max: hard.runtime_max,
      release_year_min: hard.release_year_min,
      release_year_max: hard.release_year_max,
      original_language: hard.original_language,
    },
  }
}

export function parseTmdbMovies(value: unknown) {
  const result = movieListSchema.safeParse(value)
  if (!result.success) throw new Error('TMDB movie response is invalid')
  return result.data.results
}

export function parseKeywordId(value: unknown) {
  const result = keywordSearchSchema.safeParse(value)
  if (!result.success) throw new Error('TMDB keyword response is invalid')
  return result.data.results[0]?.id
}

function normalizedText(value: string) {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')
}

function copiesOverview(reason: string, movie: CandidateMovie) {
  const normalizedReason = normalizedText(reason)
  return (
    normalizedReason.length >= 12 &&
    normalizedText(movie.overview).includes(normalizedReason)
  )
}

export function parseRankedRecommendations(
  value: unknown,
  candidates: CandidateMovie[],
  locale: RecommendationRequest['locale'],
) {
  const expectedCount = Math.min(candidates.length, MAX_RECOMMENDATIONS)
  const candidateById = new Map(candidates.map((movie) => [movie.id, movie]))
  const schema = z
    .object({
      recommendations: z
        .array(
          z
            .object({
              movie_id: z.number().int().positive(),
              reason: z.string().trim().min(1).max(120),
              kind: z.enum(['primary', 'wildcard']),
            })
            .strict(),
        )
        .length(expectedCount),
    })
    .strict()
    .superRefine((result, context) => {
      const seen = new Set<number>()
      let wildcardCount = 0

      result.recommendations.forEach((recommendation, index) => {
        const movie = candidateById.get(recommendation.movie_id)
        if (!movie || seen.has(recommendation.movie_id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'recommendation movie ids must be unique candidates',
            path: ['recommendations', index, 'movie_id'],
          })
        }
        seen.add(recommendation.movie_id)

        if (recommendation.kind === 'wildcard') wildcardCount += 1
        if (
          locale === 'zh-TW' &&
          Array.from(recommendation.reason).length > 50
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Traditional Chinese reason is too long',
            path: ['recommendations', index, 'reason'],
          })
        }
        if (
          /^(符合你的條件|很適合你|fits your (criteria|request))[\p{P}\s]*$/iu.test(
            recommendation.reason,
          ) ||
          (movie && copiesOverview(recommendation.reason, movie))
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'recommendation reason is not specific',
            path: ['recommendations', index, 'reason'],
          })
        }
      })

      if (wildcardCount > 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'at most one wildcard is allowed',
          path: ['recommendations'],
        })
      }
    })

  const result = schema.safeParse(value)
  if (!result.success)
    throw new Error('reranking result has an invalid structure')
  return result.data.recommendations
}

export function parseToolArguments(value: unknown, expectedToolName: string) {
  const responseSchema = z
    .object({
      choices: z
        .array(
          z
            .object({
              message: z
                .object({
                  tool_calls: z.array(
                    z
                      .object({
                        function: z
                          .object({
                            name: z.string(),
                            arguments: z.string(),
                          })
                          .passthrough(),
                      })
                      .passthrough(),
                  ),
                })
                .passthrough(),
            })
            .passthrough(),
        )
        .min(1),
    })
    .passthrough()
  const parsed = responseSchema.safeParse(value)
  const call = parsed.success
    ? parsed.data.choices[0]?.message.tool_calls.find(
        (item) => item.function.name === expectedToolName,
      )
    : undefined

  if (!call) throw new Error(`AI model did not call ${expectedToolName}`)

  try {
    return JSON.parse(call.function.arguments) as unknown
  } catch {
    throw new Error(`AI model returned invalid ${expectedToolName} arguments`)
  }
}

export function buildDiscoverSearchParams(
  plan: DiscoverPlan,
  keywordIds: number[],
  sortBy: 'popularity.desc' | 'vote_average.desc',
  relaxIncludes = false,
) {
  const params = new URLSearchParams({
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    sort_by: sortBy,
    'vote_count.gte': '100',
  })

  if (!relaxIncludes && plan.include_genre_ids.length) {
    params.set('with_genres', plan.include_genre_ids.join('|'))
  }
  if (!relaxIncludes && keywordIds.length) {
    params.set('with_keywords', keywordIds.join('|'))
  }
  if (plan.exclude_genre_ids.length) {
    params.set('without_genres', plan.exclude_genre_ids.join('|'))
  }
  if (plan.runtime_max) {
    params.set('with_runtime.lte', String(plan.runtime_max))
  }
  if (plan.release_year_min) {
    params.set('primary_release_date.gte', `${plan.release_year_min}-01-01`)
  }
  if (plan.release_year_max) {
    params.set('primary_release_date.lte', `${plan.release_year_max}-12-31`)
  }
  if (plan.original_language) {
    params.set('with_original_language', plan.original_language)
  }

  return params
}

export function mergeCandidatePools(
  popular: CandidateMovie[],
  rated: CandidateMovie[],
  limit = MAX_CANDIDATES,
) {
  const merged: CandidateMovie[] = []
  const seen = new Set<number>()
  const length = Math.max(popular.length, rated.length)

  for (let index = 0; index < length && merged.length < limit; index += 1) {
    for (const movie of [popular[index], rated[index]]) {
      if (movie && !seen.has(movie.id)) {
        seen.add(movie.id)
        merged.push(movie)
        if (merged.length === limit) break
      }
    }
  }

  return merged
}

export function createPlanMessages(request: RecommendationRequest) {
  const language =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'

  return [
    {
      role: 'system',
      content: `Create a safe TMDB movie query plan and call plan_movie_search. Write summaries and labels in ${language}. Explicit goals such as wanting to cry or change mood override inferred direction. If the user only states a negative current state, default toward gentle mood regulation. Only conditions explicitly stated by the user may become hard constraints. Inferred genre, pace, cognitive effort, mood, and themes are soft preferences. Use only allowed genre IDs, at most three included genres, three excluded genres, two keyword names, and three soft qualities. Keywords must be names, never IDs. Include one hard label for every explicit constraint and only the two or three most important soft labels. Do not diagnose the user, reveal reasoning, or add actor, director, provider, certification, streaming-service, or reference-movie filters.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        request: request.request,
        locale: request.locale,
      }),
    },
  ]
}

export function createRerankMessages(
  request: RecommendationRequest,
  plan: ContextPlan,
  candidates: CandidateMovie[],
) {
  const language =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'

  return [
    {
      role: 'system',
      content: `Select and reorder the best movies for the user, then call rank_movie_candidates. Return exactly ${Math.min(candidates.length, MAX_RECOMMENDATIONS)} unique candidate IDs. Prioritize contextual fit; at most one result may be a wildcard. Each one-sentence reason must connect a user need to evidence present in the candidate fields. Write in ${language}; Traditional Chinese reasons are at most 50 Unicode characters and English reasons at most 120 characters. Do not copy the overview, repeat sensitive input, diagnose the user, use generic filler, or claim actors, directors, runtime, plot facts, or other facts absent from the candidates.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        request: request.request,
        intent_summary: plan.intent_summary,
        hard_constraints: plan.hard_constraints,
        soft_preferences: plan.soft_preferences,
        candidates: candidates.map((movie) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          genre_ids: movie.genre_ids,
          release_year: movie.release_date.slice(0, 4),
          original_language: movie.original_language,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          popularity: movie.popularity,
        })),
      }),
    },
  ]
}

export const PLAN_TOOL = {
  type: 'function',
  function: {
    name: 'plan_movie_search',
    description: 'Return the validated contextual movie search plan.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: [
        'intent_summary',
        'hard_constraints',
        'soft_preferences',
        'display_labels',
      ],
      properties: {
        intent_summary: { type: 'string' },
        hard_constraints: {
          type: 'object',
          additionalProperties: false,
          required: ['exclude_genre_ids'],
          properties: {
            exclude_genre_ids: {
              type: 'array',
              maxItems: 3,
              items: { type: 'integer', enum: [...TMDB_MOVIE_GENRE_IDS] },
            },
            runtime_max: { type: 'integer', minimum: 30, maximum: 360 },
            release_year_min: { type: 'integer', minimum: 1870, maximum: 2100 },
            release_year_max: { type: 'integer', minimum: 1870, maximum: 2100 },
            original_language: { type: 'string', pattern: '^[a-z]{2}$' },
          },
        },
        soft_preferences: {
          type: 'object',
          additionalProperties: false,
          required: ['include_genre_ids', 'keyword_names', 'qualities'],
          properties: {
            include_genre_ids: {
              type: 'array',
              maxItems: 3,
              items: { type: 'integer', enum: [...TMDB_MOVIE_GENRE_IDS] },
            },
            keyword_names: {
              type: 'array',
              maxItems: 2,
              items: { type: 'string' },
            },
            qualities: {
              type: 'array',
              maxItems: 3,
              items: { type: 'string' },
            },
          },
        },
        display_labels: {
          type: 'object',
          additionalProperties: false,
          required: ['hard', 'soft'],
          properties: {
            hard: { type: 'array', maxItems: 6, items: { type: 'string' } },
            soft: { type: 'array', maxItems: 3, items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const

export const RERANK_TOOL = {
  type: 'function',
  function: {
    name: 'rank_movie_candidates',
    description: 'Select and order contextual movie recommendations.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['recommendations'],
      properties: {
        recommendations: {
          type: 'array',
          maxItems: MAX_RECOMMENDATIONS,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['movie_id', 'reason', 'kind'],
            properties: {
              movie_id: { type: 'integer' },
              reason: { type: 'string' },
              kind: { type: 'string', enum: ['primary', 'wildcard'] },
            },
          },
        },
      },
    },
  },
} as const
