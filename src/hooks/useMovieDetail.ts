import { useQuery } from '@tanstack/react-query'
import {
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
  getTvAggregateCredits,
  getTvDetail,
  getTvVideos,
} from '@/services/tmdb/api'
import { getOmdbMovie } from '@/services/omdb/api'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'
import type { MediaType } from '@/services/tmdb/types'
import type {
  CreditsResponse,
  MovieDetail,
  TvAggregateCreditsResponse,
  TvDetail,
} from '@/services/tmdb/types'

export function useMovieDetail(
  movieId: number,
  mediaType: MediaType = 'movie',
) {
  const language = useLanguageStore((state) => state.language)
  const tmdbLanguage = TMDB_LANGUAGE_MAP[language]
  const fetchDetail = (): Promise<MovieDetail | TvDetail> =>
    mediaType === 'tv'
      ? getTvDetail(movieId, tmdbLanguage)
      : getMovieDetail(movieId, tmdbLanguage)
  const fetchCredits = (): Promise<
    CreditsResponse | TvAggregateCreditsResponse
  > =>
    mediaType === 'tv'
      ? getTvAggregateCredits(movieId, tmdbLanguage)
      : getMovieCredits(movieId, tmdbLanguage)

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.media.detail(mediaType, movieId, tmdbLanguage),
    queryFn: fetchDetail,
    enabled: movieId > 0,
  })

  const creditsQuery = useQuery({
    queryKey: QUERY_KEYS.media.credits(mediaType, movieId, tmdbLanguage),
    queryFn: fetchCredits,
    enabled: movieId > 0,
  })

  const videosQuery = useQuery({
    queryKey: QUERY_KEYS.media.videos(mediaType, movieId, tmdbLanguage),
    queryFn: () =>
      mediaType === 'tv'
        ? getTvVideos(movieId, tmdbLanguage)
        : getMovieVideos(movieId, tmdbLanguage),
    enabled: movieId > 0,
  })

  const omdbQuery = useQuery({
    queryKey: QUERY_KEYS.movies.omdb(
      detailQuery.data && 'imdb_id' in detailQuery.data
        ? detailQuery.data.imdb_id
        : undefined,
    ),
    queryFn: () =>
      getOmdbMovie(
        detailQuery.data && 'imdb_id' in detailQuery.data
          ? detailQuery.data.imdb_id
          : undefined,
      ),
    enabled:
      mediaType === 'movie' &&
      Boolean(
        detailQuery.data &&
        'imdb_id' in detailQuery.data &&
        detailQuery.data.imdb_id,
      ),
    retry: false,
  })

  return {
    detail: detailQuery.data,
    credits: creditsQuery.data,
    videos: videosQuery.data,
    omdb: omdbQuery.data,
    isLoading:
      detailQuery.isLoading || creditsQuery.isLoading || videosQuery.isLoading,
    isError: detailQuery.isError || creditsQuery.isError || videosQuery.isError,
    error: detailQuery.error ?? creditsQuery.error ?? videosQuery.error,
  }
}
