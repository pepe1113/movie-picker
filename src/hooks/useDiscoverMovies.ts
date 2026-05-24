import { useInfiniteQuery } from '@tanstack/react-query'
import { discoverMovies } from '@/services/tmdb/api'
import { useFilterStore } from '@/stores/filterStore'
import { QUERY_KEYS } from '@/utils/constants'
import { buildFilterDiscoverQuery } from '@/utils/pickerCriteria'

interface UseDiscoverMoviesOptions {
  enabled?: boolean
}

export function useDiscoverMovies(options: UseDiscoverMoviesOptions = {}) {
  const { enabled = true } = options
  const filter = useFilterStore()
  const params = buildFilterDiscoverQuery(filter)

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.movies.discover(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      discoverMovies({
        ...params,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      movies: data.pages.flatMap((page) => page.results),
      totalResults: data.pages[0]?.total_results ?? 0,
    }),
    enabled,
  })
}
