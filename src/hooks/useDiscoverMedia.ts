import { useInfiniteQuery } from '@tanstack/react-query'
import { discoverMovies, discoverTv } from '@/services/tmdb/api'
import type { MediaListResponse, MediaType } from '@/services/tmdb/types'
import { useLanguageStore } from '@/stores/languageStore'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'

export function useDiscoverMedia(mediaType: MediaType, genreId: number | null) {
  const language = useLanguageStore((state) => state.language)
  const params = {
    sort_by: 'popularity.desc',
    with_genres: genreId?.toString(),
    language: TMDB_LANGUAGE_MAP[language],
  }
  const fetchMedia = (page: number): Promise<MediaListResponse> =>
    mediaType === 'movie'
      ? discoverMovies({ ...params, page })
      : discoverTv({ ...params, page })

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.media.discover(mediaType, params),
    queryFn: ({ pageParam }) => fetchMedia(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      media: data.pages.flatMap((page) => page.results),
      totalResults: data.pages[0]?.total_results ?? 0,
    }),
    enabled: genreId !== null,
  })
}
