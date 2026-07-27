import { useInfiniteQuery } from '@tanstack/react-query'
import {
  getOnTheAirTv,
  getPopularTv,
  getTrendingMovies,
  getTrendingTv,
  getPopularMovies,
  getTopRatedTv,
  getTopRatedMovies,
  getNowPlayingMovies,
} from '@/services/tmdb/api'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'
import type { MediaListResponse, MediaType } from '@/services/tmdb/types'

type MovieListType = 'trending' | 'popular' | 'top_rated' | 'now_playing'
export type MediaListType = 'trending' | 'popular' | 'top_rated' | 'latest'

const fetcherMap: Record<
  MediaType,
  Record<
    MediaListType,
    (page: number, language?: string) => Promise<MediaListResponse>
  >
> = {
  movie: {
    trending: getTrendingMovies,
    popular: getPopularMovies,
    top_rated: getTopRatedMovies,
    latest: getNowPlayingMovies,
  },
  tv: {
    trending: getTrendingTv,
    popular: getPopularTv,
    top_rated: getTopRatedTv,
    latest: getOnTheAirTv,
  },
}

interface UseMediaListOptions {
  enabled?: boolean
}

export function useMediaList(
  mediaType: MediaType,
  type: MediaListType,
  options: UseMediaListOptions = {},
) {
  const language = useLanguageStore((state) => state.language)

  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.media.list(mediaType, type), language],
    queryFn: ({ pageParam }) =>
      fetcherMap[mediaType][type](pageParam, TMDB_LANGUAGE_MAP[language]),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      media: data.pages.flatMap((page) => page.results),
      movies: data.pages.flatMap((page) => page.results),
      totalResults: data.pages[0]?.total_results ?? 0,
    }),
    enabled: options.enabled ?? true,
  })
}

export function useMovies(type: MovieListType) {
  return useMediaList('movie', type === 'now_playing' ? 'latest' : type)
}
