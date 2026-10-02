import { z } from 'zod'
import { MAX_CANDIDATES, type DiscoverPlan, type MediaType } from './domain.ts'

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

export type CandidateMovie = z.infer<typeof movieSchema>
export type CandidateTv = z.infer<typeof tvSchema>
export type CandidateMedia = CandidateMovie | CandidateTv
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

export function buildDiscoverSearchParams(
  mediaType: MediaType,
  plan: DiscoverPlan,
  keywordIds: number[],
  sortBy: 'popularity.desc' | 'vote_average.desc',
  includeInferred = true,
  excludedKeywordIds: number[] = [],
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
  if (excludedKeywordIds.length)
    params.set('without_keywords', excludedKeywordIds.join('|'))
  if (plan.exclude_genre_ids.length) {
    params.set('without_genres', plan.exclude_genre_ids.join('|'))
  }
  if (plan.runtime_min) params.set('with_runtime.gte', String(plan.runtime_min))
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
