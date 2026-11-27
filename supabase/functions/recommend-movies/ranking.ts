import type { CandidateMedia } from './tmdb.ts'

/** Weights for the final order of candidates that passed the relevance gate. */
export const RANKING_WEIGHTS = {
  semantic: 0.6,
  acclaim: 0.25,
  familiarity: 0.15,
} as const

/** Critic and audience scores from OMDb, each normalized to 0–1. */
export interface ExternalRatings {
  imdbRating?: number
  imdbVotes?: number
  rottenTomatoes?: number
  metacritic?: number
}

// Bayesian prior: a title needs about this many votes before its own
// average outweighs the global mean, so a 9.0 from 150 votes cannot beat
// an 8.2 from 30,000 votes.
const PRIOR_VOTES = 500
const PRIOR_MEAN = 6.5

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function bayesianRating(average: number, votes: number) {
  return (votes * average + PRIOR_VOTES * PRIOR_MEAN) / (votes + PRIOR_VOTES)
}

/** Maps a 10-point rating so 5.0 → 0 and 9.0 → 1. */
function normalizeTenPoint(rating: number) {
  return clamp01((rating - 5) / 4)
}

/**
 * Critical and audience acclaim on a 0–1 scale. TMDB is the base; when OMDb
 * has data, the external sources' mean counts for half, so the number of
 * sources a title happens to have does not change its weight.
 */
export function acclaimScore(media: CandidateMedia, ratings?: ExternalRatings) {
  const tmdb = normalizeTenPoint(
    bayesianRating(media.vote_average, media.vote_count),
  )
  const external: number[] = []
  if (ratings?.imdbRating !== undefined) {
    // Without an IMDb vote count, shrink by TMDB's count instead of by zero
    // votes, which would collapse every rating to the prior.
    const votes = ratings.imdbVotes ?? media.vote_count
    external.push(
      normalizeTenPoint(bayesianRating(ratings.imdbRating * 10, votes)),
    )
  }
  if (ratings?.rottenTomatoes !== undefined)
    external.push(ratings.rottenTomatoes)
  if (ratings?.metacritic !== undefined) external.push(ratings.metacritic)
  if (external.length === 0) return tmdb
  const externalMean =
    external.reduce((total, value) => total + value, 0) / external.length
  return (tmdb + externalMean) / 2
}

/**
 * How widely a title has been seen, from TMDB vote counts on a log scale:
 * 100 votes → 0, 100,000 votes → 1. Only TMDB counts are used so a title
 * is not ranked higher just because its OMDb lookup succeeded (IMDb counts
 * run roughly 5–20× TMDB's). Vote count is used rather than TMDB
 * popularity, which mostly tracks this week's traffic.
 */
export function familiarityScore(media: CandidateMedia) {
  return clamp01((Math.log10(Math.max(media.vote_count, 1)) - 2) / 3)
}

/** Blends relevance with acclaim and familiarity; semantic may be absent. */
export function blendedScore(
  media: CandidateMedia,
  semantic: number | undefined,
  ratings?: ExternalRatings,
) {
  const acclaim = acclaimScore(media, ratings)
  const familiarity = familiarityScore(media)
  if (semantic === undefined) {
    const total = RANKING_WEIGHTS.acclaim + RANKING_WEIGHTS.familiarity
    return (
      (acclaim * RANKING_WEIGHTS.acclaim +
        familiarity * RANKING_WEIGHTS.familiarity) /
      total
    )
  }
  return (
    semantic * RANKING_WEIGHTS.semantic +
    acclaim * RANKING_WEIGHTS.acclaim +
    familiarity * RANKING_WEIGHTS.familiarity
  )
}

function parsePercent(value: unknown) {
  if (typeof value !== 'string') return undefined
  const match = /^(\d{1,3})%$/.exec(value.trim())
  return match ? clamp01(Number(match[1]) / 100) : undefined
}

function parseFraction(value: unknown, scale: number) {
  if (typeof value !== 'string') return undefined
  const number = Number.parseFloat(value.split('/')[0] ?? '')
  return Number.isFinite(number) ? clamp01(number / scale) : undefined
}

/** Reads the fields we use from an OMDb `?i=` response. */
export function parseOmdbRatings(value: unknown): ExternalRatings | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const data = value as Record<string, unknown>
  if (data.Response !== 'True') return undefined
  const ratings = Array.isArray(data.Ratings) ? data.Ratings : []
  const source = (name: string) =>
    (
      ratings.find(
        (rating) =>
          typeof rating === 'object' &&
          rating !== null &&
          (rating as Record<string, unknown>).Source === name,
      ) as Record<string, unknown> | undefined
    )?.Value
  const imdb = parseFraction(data.imdbRating, 10)
  const votes =
    typeof data.imdbVotes === 'string'
      ? Number.parseInt(data.imdbVotes.replaceAll(',', ''), 10)
      : Number.NaN
  const result: ExternalRatings = {
    ...(imdb !== undefined ? { imdbRating: imdb } : {}),
    ...(Number.isFinite(votes) ? { imdbVotes: votes } : {}),
    ...(parsePercent(source('Rotten Tomatoes')) !== undefined
      ? { rottenTomatoes: parsePercent(source('Rotten Tomatoes')) }
      : {}),
    ...(parseFraction(data.Metascore, 100) !== undefined
      ? { metacritic: parseFraction(data.Metascore, 100) }
      : {}),
  }
  return Object.keys(result).length ? result : undefined
}

export interface RatingsConfig {
  tmdbAccessToken: string
  omdbApiKey?: string
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const OMDB_BASE_URL = 'https://www.omdbapi.com/'
const CACHE_LIMIT = 2000
// Failed lookups are retried after this long instead of on every request.
const FAILURE_TTL_MS = 10 * 60 * 1000
// After OMDb reports a quota or auth problem, skip it for this long.
const OMDB_BACKOFF_MS = 60 * 60 * 1000

// OMDb's free plan allows 1,000 requests a day, so lookups are kept for the
// life of the function instance. `ratings` undefined records a title with
// no ratings; `expiresAt` is set only for failed lookups.
const ratingsCache = new Map<
  number,
  { ratings?: ExternalRatings; expiresAt?: number }
>()
let omdbBlockedUntil = 0

class OmdbUnavailableError extends Error {}

function remember(
  id: number,
  entry: { ratings?: ExternalRatings; expiresAt?: number },
) {
  if (ratingsCache.size >= CACHE_LIMIT && !ratingsCache.has(id)) {
    const oldest = ratingsCache.keys().next().value
    if (oldest !== undefined) ratingsCache.delete(oldest)
  }
  ratingsCache.set(id, entry)
}

function cached(id: number, now: number) {
  const entry = ratingsCache.get(id)
  if (!entry) return undefined
  if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
    ratingsCache.delete(id)
    return undefined
  }
  return entry
}

async function fetchMovieRatings(
  id: number,
  config: Required<RatingsConfig>,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const ids = await fetcher(`${TMDB_BASE_URL}/movie/${id}/external_ids`, {
    signal,
    headers: {
      Authorization: `Bearer ${config.tmdbAccessToken}`,
      Accept: 'application/json',
    },
  })
  if (!ids.ok) throw new Error(`TMDB external ids failed: ${ids.status}`)
  const imdbId = ((await ids.json()) as { imdb_id?: unknown }).imdb_id
  if (typeof imdbId !== 'string' || !/^tt\d+$/.test(imdbId)) return undefined
  const response = await fetcher(
    `${OMDB_BASE_URL}?${new URLSearchParams({ apikey: config.omdbApiKey, i: imdbId })}`,
    { signal },
  )
  if (response.status === 401 || response.status === 429) {
    throw new OmdbUnavailableError(`OMDb unavailable: ${response.status}`)
  }
  if (!response.ok) throw new Error(`OMDb failed: ${response.status}`)
  const data = (await response.json()) as Record<string, unknown> | null
  if (data?.Response === 'False' && /limit|api key/i.test(String(data.Error))) {
    throw new OmdbUnavailableError(`OMDb unavailable: ${String(data.Error)}`)
  }
  return parseOmdbRatings(data)
}

/**
 * Looks up Rotten Tomatoes, IMDb and Metacritic scores for movies through
 * OMDb. Returns an empty map without an OMDb key; failures are skipped so
 * ranking can fall back to TMDB data alone.
 */
export async function fetchExternalRatings(
  candidates: CandidateMedia[],
  config: RatingsConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const ratings = new Map<number, ExternalRatings>()
  const { omdbApiKey } = config
  if (!omdbApiKey) return ratings
  const movies = candidates.filter((media) => media.media_type === 'movie')
  await Promise.allSettled(
    movies.map(async (media) => {
      const now = Date.now()
      const hit = cached(media.id, now)
      if (hit) {
        if (hit.ratings) ratings.set(media.id, hit.ratings)
        return
      }
      if (now < omdbBlockedUntil) return
      try {
        const value = await fetchMovieRatings(
          media.id,
          { ...config, omdbApiKey },
          signal,
          fetcher,
        )
        remember(media.id, { ratings: value })
        if (value) ratings.set(media.id, value)
      } catch (error) {
        if (error instanceof OmdbUnavailableError) {
          omdbBlockedUntil = Date.now() + OMDB_BACKOFF_MS
        } else if (!signal.aborted) {
          remember(media.id, { expiresAt: Date.now() + FAILURE_TTL_MS })
        }
      }
    }),
  )
  return ratings
}

/** Test hook: forget cached OMDb lookups. */
export function clearRatingsCache() {
  ratingsCache.clear()
  omdbBlockedUntil = 0
}
