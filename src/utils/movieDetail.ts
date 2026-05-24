import type { OmdbMovieResponse } from '@/services/omdb/types'
import { findYouTubeTrailer } from '@/utils/trailerMedia'
import type {
  CreditsResponse,
  MovieDetail,
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
