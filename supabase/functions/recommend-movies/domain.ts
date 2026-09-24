import { z } from 'zod'

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

export function genresFor(
  mediaType: MediaType,
): Readonly<Record<string, number>> {
  return mediaType === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES
}

const genreNameSchema = (genres: Readonly<Record<string, number>>) =>
  z
    .string()
    .refine(
      (value) => Object.hasOwn(genres, value),
      'genre name is not allowed',
    )

const providerHardConstraintsSchema = (
  genres: Readonly<Record<string, number>>,
) =>
  z
    .object({
      exclude_genres: z.array(genreNameSchema(genres)).max(3).default([]),
      exclude_keywords: z
        .array(
          z
            .object({
              lookup_name: z.string().trim().min(1).max(50),
              display_label: labelSchema,
            })
            .strict(),
        )
        .max(2)
        .default([]),
      runtime_min: z
        .number()
        .int()
        .min(1)
        .max(360)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      runtime_max: z
        .number()
        .int()
        .min(1)
        .max(360)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      release_year_min: z
        .number()
        .int()
        .min(1870)
        .max(2100)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      release_year_max: z
        .number()
        .int()
        .min(1870)
        .max(2100)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      original_language: z
        .string()
        .regex(/^[a-z]{2}$/)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
      origin_country: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
    })
    .strict()
    .superRefine((value, context) => {
      if (
        value.runtime_min &&
        value.runtime_max &&
        value.runtime_min > value.runtime_max
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'runtime minimum cannot exceed maximum',
        })
      }
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

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>
export const QUERY_PLAN_ACCEPT = 'application/vnd.movie-picker.query-plan+json'

export function wantsQueryPlan(accept: string | null) {
  return (
    accept?.split(',').some((value) => value.trim() === QUERY_PLAN_ACCEPT) ??
    false
  )
}
export interface HardConstraints {
  exclude_genre_ids: number[]
  exclude_keywords: Array<{ lookup_name: string; display_label: string }>
  runtime_min?: number
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
export type KeywordPreference = SoftPreferences['keywords'][number]

export interface PersonCondition {
  name: string
  role: PersonRole
}

export interface ResolvedPerson extends Omit<PersonCondition, 'role'> {
  id: number
  role: Exclude<PersonRole, 'any'>
}

export interface ResolvedKeyword extends KeywordPreference {
  id: number
}

export interface DiscoverPlan {
  include_genres: SoftPreferences['include_genres']
  exclude_genre_ids: number[]
  exclude_keywords: HardConstraints['exclude_keywords']
  keywords: KeywordPreference[]
  runtime_min?: number
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

export interface QueryPlanSnapshot {
  schema_version: 1
  hard_constraints: {
    exclude_genres: string[]
    exclude_keywords: HardConstraints['exclude_keywords']
    runtime_min: number | null
    runtime_max: number | null
    release_year_min: number | null
    release_year_max: number | null
    original_language: string | null
    origin_country: string | null
  }
  soft_preferences: {
    include_genres: Array<{ name: string; source: ConditionSource }>
    keywords: KeywordPreference[]
    qualities: string[]
  }
  people: ResolvedPerson[]
  people_match: ContextPlan['people_match']
}

function genreNameFor(mediaType: MediaType, id: number) {
  return Object.entries(genresFor(mediaType)).find(
    ([, genreId]) => genreId === id,
  )?.[0]
}

export function createQueryPlanSnapshot(
  mediaType: MediaType,
  plan: ContextPlan,
  resolvedPeople: ResolvedPerson[],
  resolvedKeywords: ResolvedKeyword[],
): QueryPlanSnapshot {
  const hard = plan.hard_constraints
  return {
    schema_version: 1,
    hard_constraints: {
      exclude_genres: hard.exclude_genre_ids.flatMap((id) => {
        const name = genreNameFor(mediaType, id)
        return name ? [name] : []
      }),
      exclude_keywords: hard.exclude_keywords,
      runtime_min: hard.runtime_min ?? null,
      runtime_max: hard.runtime_max ?? null,
      release_year_min: hard.release_year_min ?? null,
      release_year_max: hard.release_year_max ?? null,
      original_language: hard.original_language ?? null,
      origin_country: hard.origin_country ?? null,
    },
    soft_preferences: {
      include_genres: plan.soft_preferences.include_genres.flatMap(
        ({ id, source }) => {
          const name = genreNameFor(mediaType, id)
          return name ? [{ name, source }] : []
        },
      ),
      keywords: resolvedKeywords.map(
        ({ lookup_name, display_label, source }) => ({
          lookup_name,
          display_label,
          source,
        }),
      ),
      qualities: plan.soft_preferences.qualities,
    },
    people: resolvedPeople,
    people_match: plan.people_match,
  }
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
      exclude_keywords: hard.exclude_keywords,
      keywords: soft.keywords,
      runtime_min: hard.runtime_min,
      runtime_max: hard.runtime_max,
      release_year_min: hard.release_year_min,
      release_year_max: hard.release_year_max,
      original_language: hard.original_language,
      origin_country: hard.origin_country,
    },
  }
}
