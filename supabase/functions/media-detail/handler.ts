import { z } from 'zod'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const OMDB_BASE_URL = 'https://www.omdbapi.com/'
const TMDB_TIMEOUT_MS = 5_000
const OMDB_TIMEOUT_MS = 1_500

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const requestSchema = z
  .object({
    media_type: z.enum(['movie', 'tv']),
    id: z.number().int().positive().max(2_147_483_647),
    language: z.enum(['zh-TW', 'en-US']),
  })
  .strict()

const genreSchema = z.object({ id: z.number(), name: z.string() })
const detailBase = {
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genres: z.array(genreSchema),
  id: z.number().int().positive(),
  original_language: z.string(),
  overview: z.string(),
  popularity: z.number(),
  poster_path: z.string().nullable(),
  status: z.string(),
  tagline: z.string(),
  vote_average: z.number(),
  vote_count: z.number().int().nonnegative(),
}

const movieDetailSchema = z
  .object({
    ...detailBase,
    budget: z.number(),
    imdb_id: z
      .string()
      .nullable()
      .transform((value) => value ?? ''),
    original_title: z.string(),
    release_date: z.string(),
    revenue: z.number(),
    runtime: z
      .number()
      .nullable()
      .transform((value) => value ?? 0),
    title: z.string().min(1),
    video: z.boolean(),
  })
  .passthrough()

const tvDetailSchema = z
  .object({
    ...detailBase,
    episode_run_time: z.array(z.number()),
    first_air_date: z.string(),
    name: z.string().min(1),
    next_episode_to_air: z
      .object({ air_date: z.string().nullable() })
      .passthrough()
      .nullable(),
    number_of_episodes: z.number().int(),
    number_of_seasons: z.number().int(),
    origin_country: z.array(z.string()),
    original_name: z.string(),
  })
  .passthrough()

const castSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    profile_path: z.string().nullable(),
    character: z.string(),
  })
  .passthrough()

const tvCastSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    profile_path: z.string().nullable(),
    roles: z.array(
      z.object({ character: z.string(), credit_id: z.string() }).passthrough(),
    ),
  })
  .passthrough()

const videoSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    site: z.string(),
    type: z.string(),
  })
  .passthrough()

const omdbSchema = z
  .object({
    Response: z.enum(['True', 'False']),
    Ratings: z
      .array(z.object({ Source: z.string(), Value: z.string() }))
      .optional(),
  })
  .passthrough()

class UpstreamError extends Error {
  readonly status: number

  constructor(status: number) {
    super('Upstream request failed')
    this.status = status
  }
}

export interface MediaDetailDependencies {
  tmdbToken?: string
  omdbKey?: string
  fetcher?: typeof fetch
  warn?: (source: string, status: number | 'invalid') => void
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const signal = AbortSignal.any([
    init.signal ?? new AbortController().signal,
    AbortSignal.timeout(timeoutMs),
  ])
  const response = await fetcher(url, { ...init, signal })
  if (!response.ok) throw new UpstreamError(response.status)
  return response.json() as Promise<unknown>
}

export async function handleMediaDetailRequest(
  req: Request,
  {
    tmdbToken,
    omdbKey,
    fetcher = fetch,
    warn = console.warn,
  }: MediaDetailDependencies,
): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success)
    return json({ error: 'Invalid media detail request' }, 400)
  if (!tmdbToken) return json({ error: 'Media detail is not configured' }, 500)

  const { media_type, id, language } = parsed.data
  const base = `${TMDB_BASE_URL}/${media_type}/${id}`
  const tmdb = (url: string) =>
    fetchJson(
      fetcher,
      url,
      {
        headers: { Authorization: `Bearer ${tmdbToken}` },
        signal: req.signal,
      },
      TMDB_TIMEOUT_MS,
    )
  const withLanguage = (path: string) =>
    `${base}${path}?${new URLSearchParams({ language })}`
  const creditsPath = media_type === 'tv' ? '/aggregate_credits' : '/credits'
  const creditsPromise = tmdb(withLanguage(creditsPath))
  const videosPromise = tmdb(withLanguage('/videos'))
  const optionalTmdb = Promise.allSettled([creditsPromise, videosPromise])

  let detail: z.infer<typeof movieDetailSchema> | z.infer<typeof tvDetailSchema>
  try {
    const rawDetail = await tmdb(withLanguage(''))
    const result = (
      media_type === 'tv' ? tvDetailSchema : movieDetailSchema
    ).safeParse(rawDetail)
    if (!result.success || result.data.id !== id) throw new UpstreamError(502)
    detail = result.data
  } catch (error) {
    // The optional requests have already started; consume failures before returning.
    void optionalTmdb
    return json(
      {
        error:
          error instanceof UpstreamError && error.status === 404
            ? 'Media not found'
            : 'Media detail provider failed',
      },
      error instanceof UpstreamError && error.status === 404 ? 404 : 502,
    )
  }

  const imdbId =
    'imdb_id' in detail && typeof detail.imdb_id === 'string'
      ? detail.imdb_id
      : ''
  const omdbPromise =
    media_type === 'movie' && omdbKey && imdbId
      ? fetchJson(
          fetcher,
          `${OMDB_BASE_URL}?${new URLSearchParams({ apikey: omdbKey, i: imdbId })}`,
          {
            signal: req.signal,
          },
          OMDB_TIMEOUT_MS,
        )
      : Promise.resolve(null)

  const [[creditsResult, videosResult], omdbResult] = await Promise.all([
    optionalTmdb,
    omdbPromise.then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    ),
  ])
  const creditsSchema = z
    .object({
      cast: z.array(media_type === 'tv' ? tvCastSchema : castSchema),
    })
    .passthrough()
  const videosSchema = z.object({ results: z.array(videoSchema) }).passthrough()
  const credits =
    creditsResult.status === 'fulfilled'
      ? creditsSchema.safeParse(creditsResult.value)
      : null
  const videos =
    videosResult.status === 'fulfilled'
      ? videosSchema.safeParse(videosResult.value)
      : null
  const omdb =
    omdbResult.status === 'fulfilled' && omdbResult.value !== null
      ? omdbSchema.safeParse(omdbResult.value)
      : null

  if (!credits?.success)
    warn(
      'credits',
      creditsResult.status === 'rejected' &&
        creditsResult.reason instanceof UpstreamError
        ? creditsResult.reason.status
        : 'invalid',
    )
  if (!videos?.success)
    warn(
      'videos',
      videosResult.status === 'rejected' &&
        videosResult.reason instanceof UpstreamError
        ? videosResult.reason.status
        : 'invalid',
    )
  if (omdbResult.status === 'rejected' || (omdb && !omdb.success))
    warn(
      'omdb',
      omdbResult.status === 'rejected' &&
        omdbResult.reason instanceof UpstreamError
        ? omdbResult.reason.status
        : 'invalid',
    )

  return json({
    detail,
    credits: credits?.success ? credits.data : { id, cast: [], crew: [] },
    videos: videos?.success ? videos.data : { id, results: [] },
    omdb: omdb?.success && omdb.data.Response === 'True' ? omdb.data : null,
  })
}
