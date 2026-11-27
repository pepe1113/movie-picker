import type { OmdbMovieResponse } from '@/services/omdb/types'
import { findYouTubeTrailer } from '@/utils/trailerMedia'
import { MOVIE_GENRES, ROUTES, TV_GENRES } from '@/utils/constants'
import type { Language } from '@/stores/languageStore'
import type {
  CastMember,
  Genre,
  MediaType,
  CreditsResponse,
  MediaItem,
  MovieDetail,
  TvAggregateCreditsResponse,
  TvDetail,
  VideosResponse,
} from '@/services/tmdb/types'

export interface ExternalRating {
  label: string
  value: string
}

interface MovieDetailPresentationInput {
  detail: MovieDetail
  credits?: CreditsResponse
  videos?: VideosResponse
  omdb?: OmdbMovieResponse | null
}

interface TvDetailPresentationInput {
  detail: TvDetail
  credits?: TvAggregateCreditsResponse
  videos?: VideosResponse
}

export function getExternalRatings(
  omdb: OmdbMovieResponse | null | undefined,
): ExternalRating[] {
  if (!omdb?.Ratings) return []

  return [
    {
      source: 'Internet Movie Database',
      label: 'IMDb',
    },
    {
      source: 'Rotten Tomatoes',
      label: 'Rotten Tomatoes',
    },
  ].flatMap(({ source, label }) => {
    const rating = omdb.Ratings?.find((item) => item.Source === source)
    return rating ? [{ label, value: rating.Value }] : []
  })
}

export function buildMovieDetailPresentation({
  detail,
  credits,
  videos,
  omdb,
}: MovieDetailPresentationInput) {
  return {
    cast: credits?.cast.slice(0, 12) ?? [],
    directors: uniqueNames(
      credits?.crew.filter((member) => member.job === 'Director') ?? [],
    ),
    trailer: findYouTubeTrailer(videos?.results),
    externalRatings: getExternalRatings(omdb),
    movieForWishlist: {
      adult: detail.adult,
      backdrop_path: detail.backdrop_path,
      genre_ids: detail.genres.map((genre) => genre.id),
      id: detail.id,
      original_language: detail.original_language,
      original_title: detail.original_title,
      overview: detail.overview,
      popularity: detail.popularity,
      poster_path: detail.poster_path,
      release_date: detail.release_date,
      title: detail.title,
      video: detail.video,
      vote_average: detail.vote_average,
      vote_count: detail.vote_count,
    },
  }
}

export function buildTvDetailPresentation({
  detail,
  credits,
  videos,
}: TvDetailPresentationInput) {
  const cast: CastMember[] =
    credits?.cast.slice(0, 12).map((member) => ({
      ...member,
      cast_id: member.id,
      character: member.roles[0]?.character ?? '',
      credit_id: member.roles[0]?.credit_id ?? `tv-${member.id}`,
    })) ?? []

  const mediaForWishlist: MediaItem = {
    adult: detail.adult,
    backdrop_path: detail.backdrop_path,
    first_air_date: detail.first_air_date,
    genre_ids: detail.genres.map((genre) => genre.id),
    id: detail.id,
    media_type: 'tv',
    name: detail.name,
    origin_country: detail.origin_country,
    original_language: detail.original_language,
    original_name: detail.original_name,
    overview: detail.overview,
    popularity: detail.popularity,
    poster_path: detail.poster_path,
    vote_average: detail.vote_average,
    vote_count: detail.vote_count,
  }

  return {
    cast,
    directors: uniqueNames(detail.created_by ?? []),
    trailer: findYouTubeTrailer(videos?.results),
    externalRatings: [],
    movieForWishlist: mediaForWishlist,
  }
}

export function getLocalizedGenreName(
  genre: Genre,
  mediaType: MediaType,
  language: Language,
): string {
  const primary = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
  const secondary = mediaType === 'tv' ? MOVIE_GENRES : TV_GENRES
  const match =
    primary.find(({ id }) => id === genre.id) ??
    secondary.find(({ id }) => id === genre.id)
  return match?.name[language] ?? genre.name
}

export function buildSearchLink(
  query: string,
  { companyId }: { companyId?: number } = {},
): string {
  const params = new URLSearchParams({ q: query })
  if (companyId !== undefined) params.set('company', String(companyId))
  return `${ROUTES.SEARCH}?${params.toString()}`
}

export function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(({ name }) => {
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}

function uniqueNames(people: { name: string }[]): string[] {
  return [...new Set(people.map(({ name }) => name))]
}
