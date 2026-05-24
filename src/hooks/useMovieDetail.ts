import { useQuery } from '@tanstack/react-query'
import {
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
} from '@/services/tmdb/api'
import { getOmdbMovie } from '@/services/omdb/api'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'

export function useMovieDetail(movieId: number) {
  const language = useLanguageStore((state) => state.language)
  const tmdbLanguage = TMDB_LANGUAGE_MAP[language]

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.movies.detail(movieId, tmdbLanguage),
    queryFn: () => getMovieDetail(movieId, tmdbLanguage),
    enabled: movieId > 0,
  })

  const creditsQuery = useQuery({
    queryKey: QUERY_KEYS.movies.credits(movieId, tmdbLanguage),
    queryFn: () => getMovieCredits(movieId, tmdbLanguage),
    enabled: movieId > 0,
  })

  const videosQuery = useQuery({
    queryKey: QUERY_KEYS.movies.videos(movieId, tmdbLanguage),
    queryFn: () => getMovieVideos(movieId, tmdbLanguage),
    enabled: movieId > 0,
  })

  const omdbQuery = useQuery({
    queryKey: QUERY_KEYS.movies.omdb(detailQuery.data?.imdb_id),
    queryFn: () => getOmdbMovie(detailQuery.data?.imdb_id),
    enabled: Boolean(detailQuery.data?.imdb_id),
    retry: false,
  })

  return {
    detail: detailQuery.data,
    credits: creditsQuery.data,
    videos: videosQuery.data,
    omdb: omdbQuery.data,
    isLoading:
      detailQuery.isLoading ||
      creditsQuery.isLoading ||
      videosQuery.isLoading,
    isError: detailQuery.isError || creditsQuery.isError || videosQuery.isError,
    error: detailQuery.error ?? creditsQuery.error ?? videosQuery.error,
  }
}
