import { z } from 'zod'

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const MAX_MOVIE_REQUEST_LENGTH = 500
export const MAX_CANDIDATES = 20
export const MAX_RECOMMENDATIONS = 10

export const TMDB_MOVIE_GENRES = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  science_fiction: 878,
  thriller: 53,
  tv_movie: 10770,
  war: 10752,
  western: 37,
} as const

export const TMDB_TV_GENRES = {
  action_adventure: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  kids: 10762,
  mystery: 9648,
  news: 10763,
  reality: 10764,
  sci_fi_fantasy: 10765,
  soap: 10766,
  talk: 10767,
  war_politics: 10768,
  western: 37,
} as const

export const TMDB_MOVIE_GENRE_IDS = Object.values(TMDB_MOVIE_GENRES)
export const TMDB_TV_GENRE_IDS = Object.values(TMDB_TV_GENRES)

export type MediaType = 'movie' | 'tv'
export type ConditionSource = 'explicit' | 'inferred'
export type PersonRole = 'cast' | 'director' | 'writer' | 'producer' | 'any'

const labelSchema = z.string().trim().min(1).max(40)
const sourceSchema = z.enum(['explicit', 'inferred'])

export const recommendationRequestSchema = z
  .object({
    request: z.string().trim().min(2).max(MAX_MOVIE_REQUEST_LENGTH),
    locale: z.enum(['zh-TW', 'en']),
    media_type: z.enum(['movie', 'tv']),
  })
  .strict()

function genresFor(mediaType: MediaType): Readonly<Record<string, number>> {
  return mediaType === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES
}

const genreNameSchema = (genres: Readonly<Record<string, number>>) =>
  z
    .string()
    .refine((value) => Object.hasOwn(genres, value), 'genre name is not allowed')

const providerHardConstraintsSchema = (
  genres: Readonly<Record<string, number>>,
) =>
  z
    .object({
      exclude_genres: z.array(genreNameSchema(genres)).max(3).default([]),
      runtime_max: z.number().int().min(1).max(360).optional(),
      release_year_min: z.number().int().min(1870).max(2100).optional(),
      release_year_max: z.number().int().min(1870).max(2100).optional(),
      original_language: z
        .string()
        .regex(/^[a-z]{2}$/)
        .optional(),
      origin_country: z
        .string()
        .regex(/^[A-Z]{2}$/)
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

const providerSoftPreferencesSchema = (
  genres: Readonly<Record<string, number>>,
) =>
  z
    .object({
      include_genres: z
        .array(
          z
            .object({
              name: genreNameSchema(genres),
              source: sourceSchema,
            })
            .strict(),
        )
        .max(3)
        .default([]),
      keywords: z
        .array(
          z
            .object({
              lookup_name: z.string().trim().min(1).max(50),
              display_label: labelSchema,
              source: sourceSchema,
            })
            .strict(),
        )
        .max(2)
        .default([]),
      qualities: z.array(labelSchema).max(3).default([]),
    })
    .strict()

const peopleSchema = z
  .array(
    z
      .object({
        name: z.string().trim().min(1).max(80),
        role: z.enum(['cast', 'director', 'writer', 'producer', 'any']),
      })
      .strict(),
  )
  .max(2)

function providerPlanSchema(mediaType: MediaType) {
  const genres = genresFor(mediaType)
  return z
    .object({
      intent_summary: z.string().trim().min(1).max(200),
      hard_constraints: providerHardConstraintsSchema(genres),
      soft_preferences: providerSoftPreferencesSchema(genres),
      people: peopleSchema.default([]),
      people_match: z.enum(['any', 'all']).default('any'),
      display_labels: z
        .object({
          hard: z.array(labelSchema).max(6),
          soft: z.array(labelSchema).max(4),
        })
        .strict(),
    })
    .strict()
}

const baseMediaFields = {
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number().int()),
  id: z.number().int().positive(),
  original_language: z.string(),
  overview: z.string(),
  popularity: z.number().finite(),
  poster_path: z.string().nullable(),
  vote_average: z.number().finite(),
  vote_count: z.number().int().nonnegative(),
}

export const movieSchema = z
  .object({
    ...baseMediaFields,
    original_title: z.string(),
    release_date: z.string(),
    title: z.string().trim().min(1),
    video: z.boolean(),
  })
  .strip()
  .transform((movie) => ({ ...movie, media_type: 'movie' as const }))

export const tvSchema = z
  .object({
    ...baseMediaFields,
    first_air_date: z.string(),
    name: z.string().trim().min(1),
    origin_country: z.array(z.string()),
    original_name: z.string(),
  })
  .strip()
  .transform((show) => ({ ...show, media_type: 'tv' as const }))

const keywordSearchSchema = z
  .object({
    results: z.array(
      z
        .object({
          id: z.number().int().positive(),
          name: z.string().trim().min(1),
        })
        .passthrough(),
    ),
  })
  .passthrough()

const personSearchSchema = z
  .object({
    results: z.array(
      z
        .object({
          id: z.number().int().positive(),
          known_for_department: z.string().nullable(),
          name: z.string().trim().min(1),
          original_name: z.string().trim().min(1).optional(),
          popularity: z.number().finite(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

const creditsSchema = z
  .object({
    cast: z.array(
      z
        .object({
          id: z.number().int().positive(),
        })
        .passthrough(),
    ),
    crew: z.array(
      z
        .object({
          department: z.string(),
          id: z.number().int().positive(),
          job: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>
export interface HardConstraints {
  exclude_genre_ids: number[]
  runtime_max?: number
  release_year_min?: number
  release_year_max?: number
  original_language?: string
  origin_country?: string
}
export interface SoftPreferences {
  include_genres: Array<{ id: number; source: ConditionSource }>
  keywords: Array<{
    lookup_name: string
    display_label: string
    source: ConditionSource
  }>
  qualities: string[]
}
export type CandidateMovie = z.infer<typeof movieSchema>
export type CandidateTv = z.infer<typeof tvSchema>
export type CandidateMedia = CandidateMovie | CandidateTv
export type KeywordPreference = SoftPreferences['keywords'][number]

export interface PersonCondition {
  name: string
  role: PersonRole
}

export interface ResolvedPerson extends PersonCondition {
  id: number
}

export interface ResolvedKeyword extends KeywordPreference {
  id: number
}

export interface DiscoverPlan {
  include_genres: SoftPreferences['include_genres']
  exclude_genre_ids: number[]
  keywords: KeywordPreference[]
  runtime_max?: number
  release_year_min?: number
  release_year_max?: number
  original_language?: string
  origin_country?: string
}

export interface ContextPlan {
  intent_summary: string
  hard_constraints: HardConstraints
  soft_preferences: SoftPreferences
  people: PersonCondition[]
  people_match: 'any' | 'all'
  display_labels: {
    hard: string[]
    soft: string[]
  }
  discover_plan: DiscoverPlan
}

export function validateRecommendationRequest(
  value: unknown,
): RecommendationRequest {
  const result = recommendationRequestSchema.safeParse(value)
  if (!result.success) throw new Error('recommendation request is invalid')
  return result.data
}

function lastMention(value: string, expressions: RegExp[]) {
  return expressions.reduce((latest, expression) => {
    const matches = [...value.matchAll(expression)]
    return Math.max(latest, ...matches.map((match) => match.index ?? -1))
  }, -1)
}

export function detectExplicitMediaType(value: string): MediaType | undefined {
  const movieIndex = lastMention(value, [
    /電影/giu,
    /影片/giu,
    /映画/giu,
    /\bmovies?\b/giu,
    /\bfilms?\b/giu,
  ])
  const tvIndex = lastMention(value, [
    /劇集/giu,
    /影集/giu,
    /電視劇/giu,
    /[日韓美]劇/giu,
    /ドラマ/giu,
    /\btv(?:\s+shows?)?\b/giu,
    /\bseries\b/giu,
  ])

  if (movieIndex < 0 && tvIndex < 0) return undefined
  return tvIndex > movieIndex ? 'tv' : 'movie'
}

export function hasMediaTypeMismatch(request: RecommendationRequest) {
  const explicit = detectExplicitMediaType(request.request)
  return explicit !== undefined && explicit !== request.media_type
}

export function parseContextPlan(
  value: unknown,
  mediaType: MediaType,
): ContextPlan {
  const result = providerPlanSchema(mediaType).safeParse(value)
  if (!result.success) {
    console.error(
      'query plan validation failed',
      result.error.issues.map(({ code, message, path }) => ({
        code,
        message,
        path,
      })),
    )
    throw new Error('query plan has an invalid structure')
  }

  const genres = genresFor(mediaType)
  const {
    hard_constraints: providerHard,
    soft_preferences: providerSoft,
    ...rest
  } = result.data
  const { exclude_genres: excludeGenres, ...remainingHard } = providerHard
  const hard: HardConstraints = {
    ...remainingHard,
    exclude_genre_ids: excludeGenres.map((name) => genres[name]),
  }
  const soft: SoftPreferences = {
    ...providerSoft,
    include_genres: providerSoft.include_genres.map(({ name, source }) => ({
      id: genres[name],
      source,
    })),
  }
  return {
    ...rest,
    hard_constraints: hard,
    soft_preferences: soft,
    discover_plan: {
      include_genres: soft.include_genres,
      exclude_genre_ids: hard.exclude_genre_ids,
      keywords: soft.keywords,
      runtime_max: hard.runtime_max,
      release_year_min: hard.release_year_min,
      release_year_max: hard.release_year_max,
      original_language: hard.original_language,
      origin_country: hard.origin_country,
    },
  }
}

function addUniqueGenre(
  genres: SoftPreferences['include_genres'],
  id: number,
  source: ConditionSource,
) {
  return genres.some((genre) => genre.id === id)
    ? genres
    : [...genres, { id, source }].slice(0, 3)
}

export function applyDeterministicMediaRules(
  request: RecommendationRequest,
  plan: ContextPlan,
): ContextPlan {
  if (request.media_type !== 'tv') return plan

  const isJapaneseAnimation =
    /日本(?:的)?動畫|日本アニメ|japanese anime/iu.test(request.request)
  const isJapaneseDrama =
    /日劇|日本(?:的)?(?:劇集|影集|電視劇)|japanese drama/iu.test(
      request.request,
    )
  const isLight = /輕鬆|放鬆|light(?:hearted)?|easygoing/iu.test(
    request.request,
  )
  if (!isJapaneseDrama && !isJapaneseAnimation) return plan

  const excludeGenreIds = plan.hard_constraints.exclude_genre_ids.filter(
    (id) => id !== 16 || !isJapaneseAnimation,
  )
  if (
    isJapaneseDrama &&
    !isJapaneseAnimation &&
    !excludeGenreIds.includes(16)
  ) {
    excludeGenreIds.push(16)
  }
  let includeGenres = plan.soft_preferences.include_genres.filter(
    (genre) => genre.id !== 16 || isJapaneseAnimation,
  )
  if (isJapaneseAnimation)
    includeGenres = addUniqueGenre(includeGenres, 16, 'explicit')
  if (isLight) includeGenres = addUniqueGenre(includeGenres, 35, 'explicit')

  const hardConstraints = {
    ...plan.hard_constraints,
    exclude_genre_ids: excludeGenreIds,
    original_language: 'ja',
    origin_country: 'JP',
  }
  const softPreferences = {
    ...plan.soft_preferences,
    include_genres: includeGenres,
  }

  return {
    ...plan,
    hard_constraints: hardConstraints,
    soft_preferences: softPreferences,
    display_labels: {
      ...plan.display_labels,
      soft:
        isLight &&
        !plan.display_labels.soft.includes(
          request.locale === 'zh-TW' ? '輕鬆' : 'Light',
        )
          ? [
              ...plan.display_labels.soft,
              request.locale === 'zh-TW' ? '輕鬆' : 'Light',
            ].slice(0, 4)
          : plan.display_labels.soft,
    },
    discover_plan: {
      ...plan.discover_plan,
      include_genres: includeGenres,
      exclude_genre_ids: excludeGenreIds,
      original_language: 'ja',
      origin_country: 'JP',
    },
  }
}

export function parseTmdbMedia(value: unknown, mediaType: MediaType) {
  const schema = z
    .object({
      results: z.array(mediaType === 'movie' ? movieSchema : tvSchema),
    })
    .passthrough()
  const result = schema.safeParse(value)
  if (!result.success) throw new Error(`TMDB ${mediaType} response is invalid`)
  return result.data.results as CandidateMedia[]
}

export function parseKeywordResults(value: unknown) {
  const result = keywordSearchSchema.safeParse(value)
  if (!result.success) throw new Error('TMDB keyword response is invalid')
  return result.data.results
}

export function parsePersonResults(value: unknown) {
  const result = personSearchSchema.safeParse(value)
  if (!result.success) throw new Error('TMDB person response is invalid')
  return result.data.results
}

export function parsePersonCredits(value: unknown) {
  const result = creditsSchema.safeParse(value)
  if (!result.success) throw new Error('TMDB credits response is invalid')
  return result.data
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
  mediaType: MediaType,
  plan: DiscoverPlan,
  keywordIds: number[],
  sortBy: 'popularity.desc' | 'vote_average.desc',
  includeInferred = true,
) {
  const params = new URLSearchParams({
    include_adult: 'false',
    language: 'en-US',
    sort_by: sortBy,
    'vote_count.gte': mediaType === 'movie' ? '100' : '30',
  })
  if (mediaType === 'movie') params.set('include_video', 'false')

  const genreIds = plan.include_genres
    .filter((genre) => includeInferred || genre.source === 'explicit')
    .map((genre) => genre.id)
  if (genreIds.length) params.set('with_genres', genreIds.join('|'))
  if (keywordIds.length) params.set('with_keywords', keywordIds.join('|'))
  if (plan.exclude_genre_ids.length) {
    params.set('without_genres', plan.exclude_genre_ids.join('|'))
  }
  if (plan.runtime_max) params.set('with_runtime.lte', String(plan.runtime_max))
  if (plan.release_year_min) {
    params.set(
      mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte',
      `${plan.release_year_min}-01-01`,
    )
  }
  if (plan.release_year_max) {
    params.set(
      mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte',
      `${plan.release_year_max}-12-31`,
    )
  }
  if (plan.original_language) {
    params.set('with_original_language', plan.original_language)
  }
  if (plan.origin_country)
    params.set('with_origin_country', plan.origin_country)

  return params
}

function mediaKey(media: CandidateMedia) {
  return `${media.media_type}:${media.id}`
}

export function mergeCandidatePools(
  popular: CandidateMedia[],
  rated: CandidateMedia[],
  limit = MAX_CANDIDATES,
) {
  const merged: CandidateMedia[] = []
  const seen = new Set<string>()
  const length = Math.max(popular.length, rated.length)

  for (let index = 0; index < length && merged.length < limit; index += 1) {
    for (const media of [popular[index], rated[index]]) {
      const key = media && mediaKey(media)
      if (media && key && !seen.has(key)) {
        seen.add(key)
        merged.push(media)
        if (merged.length === limit) break
      }
    }
  }
  return merged
}

export function hasInferredPreferences(plan: ContextPlan) {
  return (
    plan.discover_plan.include_genres.some(
      (genre) => genre.source === 'inferred',
    ) ||
    plan.discover_plan.keywords.some((keyword) => keyword.source === 'inferred')
  )
}

export function isGeneralExploration(plan: ContextPlan) {
  const hard = plan.hard_constraints
  return (
    plan.people.length === 0 &&
    plan.soft_preferences.include_genres.length === 0 &&
    plan.soft_preferences.keywords.length === 0 &&
    hard.exclude_genre_ids.length === 0 &&
    hard.runtime_max === undefined &&
    hard.release_year_min === undefined &&
    hard.release_year_max === undefined &&
    hard.original_language === undefined &&
    hard.origin_country === undefined
  )
}

export function createPlanMessages(request: RecommendationRequest) {
  const language =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'
  return [
    {
      role: 'system',
      content: `Create a safe TMDB ${request.media_type} query plan and call plan_movie_search. The UI-selected media type is ${request.media_type}; never infer or change it. Write summaries, display labels, and person names in ${language}. Only add a person when the user explicitly names them. Use at most two people with role cast, director, writer, producer, or any; default to any-match and use all-match only when the user explicitly asks for shared participation. Genre values must use the supplied canonical genre names, never TMDB IDs. Keyword lookup_name values must be concise English TMDB terms, never IDs; display_label remains localized. Mark every included genre and keyword as explicit only when the user stated it, otherwise inferred. Explicit goals override inferred mood direction. Only explicit restrictions belong in hard_constraints. Use at most three included genres, three excluded genres, two keywords, and three qualities. Do not diagnose the user, reveal reasoning, infer celebrities, or use reference-movie searches.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        request: request.request,
        locale: request.locale,
        media_type: request.media_type,
      }),
    },
  ]
}

export function createPlanTool(mediaType: MediaType) {
  const genreNames = Object.keys(genresFor(mediaType))
  return {
    type: 'function',
    function: {
      name: 'plan_movie_search',
      description: `Return the validated contextual ${mediaType} search plan.`,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: [
          'intent_summary',
          'hard_constraints',
          'soft_preferences',
          'people',
          'people_match',
          'display_labels',
        ],
        properties: {
          intent_summary: { type: 'string' },
          hard_constraints: {
            type: 'object',
            additionalProperties: false,
            required: ['exclude_genres'],
            properties: {
              exclude_genres: {
                type: 'array',
                maxItems: 3,
                items: { type: 'string', enum: genreNames },
              },
              runtime_max: { type: 'integer', minimum: 1, maximum: 360 },
              release_year_min: {
                type: 'integer',
                minimum: 1870,
                maximum: 2100,
              },
              release_year_max: {
                type: 'integer',
                minimum: 1870,
                maximum: 2100,
              },
              original_language: { type: 'string', pattern: '^[a-z]{2}$' },
              origin_country: { type: 'string', pattern: '^[A-Z]{2}$' },
            },
          },
          soft_preferences: {
            type: 'object',
            additionalProperties: false,
            required: ['include_genres', 'keywords', 'qualities'],
            properties: {
              include_genres: {
                type: 'array',
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'source'],
                  properties: {
                    name: { type: 'string', enum: genreNames },
                    source: { type: 'string', enum: ['explicit', 'inferred'] },
                  },
                },
              },
              keywords: {
                type: 'array',
                maxItems: 2,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['lookup_name', 'display_label', 'source'],
                  properties: {
                    lookup_name: { type: 'string' },
                    display_label: { type: 'string' },
                    source: { type: 'string', enum: ['explicit', 'inferred'] },
                  },
                },
              },
              qualities: {
                type: 'array',
                maxItems: 3,
                items: { type: 'string' },
              },
            },
          },
          people: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'role'],
              properties: {
                name: { type: 'string' },
                role: {
                  type: 'string',
                  enum: ['cast', 'director', 'writer', 'producer', 'any'],
                },
              },
            },
          },
          people_match: { type: 'string', enum: ['any', 'all'] },
          display_labels: {
            type: 'object',
            additionalProperties: false,
            required: ['hard', 'soft'],
            properties: {
              hard: { type: 'array', maxItems: 6, items: { type: 'string' } },
              soft: { type: 'array', maxItems: 4, items: { type: 'string' } },
            },
          },
        },
      },
    },
  } as const
}
