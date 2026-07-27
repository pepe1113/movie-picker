import type { OmdbMovieResponse } from '@/services/omdb/types'
import { findYouTubeTrailer } from '@/utils/trailerMedia'
import type {
  CastMember,
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
    trailer: findYouTubeTrailer(videos?.results),
    externalRatings: [],
    movieForWishlist: mediaForWishlist,
  }
}
