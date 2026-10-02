import { z } from 'zod'
import { getSupabaseClient } from './client'
import type {
  CreditsResponse,
  MediaType,
  MovieDetail,
  TvAggregateCreditsResponse,
  TvDetail,
  VideosResponse,
} from '@/services/tmdb/types'
import type { OmdbMovieResponse } from '@/services/omdb/types'

export interface MediaDetailResponse {
  detail: MovieDetail | TvDetail
  credits: CreditsResponse | TvAggregateCreditsResponse
  videos: VideosResponse
  omdb: OmdbMovieResponse | null
}

export class MediaDetailRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 404 ? 'Media not found' : 'Unable to load media detail')
    this.status = status
  }
}

const responseSchema = z.object({
  detail: z
    .object({
      id: z.number().int().positive(),
      genres: z.array(z.object({ id: z.number(), name: z.string() })),
      vote_count: z.number().int().nonnegative(),
      vote_average: z.number(),
    })
    .passthrough(),
  credits: z.object({ cast: z.array(z.unknown()) }).passthrough(),
  videos: z.object({ results: z.array(z.unknown()) }).passthrough(),
  omdb: z
    .object({
      Response: z.literal('True'),
      Ratings: z
        .array(z.object({ Source: z.string(), Value: z.string() }))
        .optional(),
    })
    .passthrough()
    .nullable(),
})

export async function getMediaDetail(
  mediaType: MediaType,
  id: number,
  language: 'zh-TW' | 'en-US',
  signal?: AbortSignal,
): Promise<MediaDetailResponse> {
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'media-detail',
    {
      body: { media_type: mediaType, id, language },
      signal,
      timeout: 8_500,
    },
  )

  if (error) {
    const context = 'context' in error ? error.context : null
    throw new MediaDetailRequestError(
      context instanceof Response ? context.status : 502,
    )
  }

  const result = responseSchema.safeParse(data)
  if (
    !result.success ||
    result.data.detail.id !== id ||
    (mediaType === 'tv'
      ? !('number_of_seasons' in result.data.detail) ||
        !Array.isArray(result.data.detail.episode_run_time)
      : typeof result.data.detail.title !== 'string')
  ) {
    throw new Error('Media detail response has an invalid structure')
  }
  return result.data as unknown as MediaDetailResponse
}
