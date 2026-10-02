import { useQuery } from '@tanstack/react-query'
import { getMediaDetail } from '@/services/supabase/mediaDetail'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'
import type { MediaType } from '@/services/tmdb/types'

export function useMovieDetail(
  movieId: number,
  mediaType: MediaType = 'movie',
) {
  const language = useLanguageStore((state) => state.language)
  const tmdbLanguage = TMDB_LANGUAGE_MAP[language]
  const validId = Number.isSafeInteger(movieId) && movieId > 0
  const query = useQuery({
    queryKey: QUERY_KEYS.media.detail(mediaType, movieId, tmdbLanguage),
    queryFn: ({ signal }) =>
      getMediaDetail(mediaType, movieId, tmdbLanguage, signal),
    enabled: validId,
    retry: false,
  })

  return {
    detail: query.data?.detail,
    credits: query.data?.credits,
    videos: query.data?.videos,
    omdb: query.data?.omdb,
    isLoading: validId && query.isLoading,
    isError: !validId || query.isError,
    error: query.error,
  }
}
