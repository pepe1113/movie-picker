import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { searchMedia } from '@/services/tmdb/api'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 500)
  const language = useLanguageStore((state) => state.language)

  const result = useInfiniteQuery({
    queryKey: QUERY_KEYS.media.search(debouncedQuery, language),
    queryFn: ({ pageParam }) =>
      searchMedia(debouncedQuery, pageParam, TMDB_LANGUAGE_MAP[language]),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: debouncedQuery.length > 0,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      media: data.pages.flatMap((page) => page.results),
      movies: data.pages.flatMap((page) => page.results),
      totalResults: data.pages.reduce(
        (total, page) => total + page.results.length,
        0,
      ),
    }),
  })

  return {
    ...result,
    debouncedQuery,
  }
}
