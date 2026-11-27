import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  discoverByCompany,
  getPersonCredits,
  searchMedia,
} from '@/services/tmdb/api'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { useLanguageStore } from '@/stores/languageStore'
import { selectInfiniteMedia } from '@/utils/movieListBrowsing'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function useSearch(query: string, { enabled = true } = {}) {
  const debouncedQuery = useDebounce(query.trim(), 500)
  const language = useLanguageStore((state) => state.language)

  const result = useInfiniteQuery({
    queryKey: QUERY_KEYS.media.search(debouncedQuery, language),
    queryFn: ({ pageParam }) =>
      searchMedia(debouncedQuery, pageParam, TMDB_LANGUAGE_MAP[language]),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: enabled && debouncedQuery.length > 0,
    select: selectInfiniteMedia,
  })

  return {
    ...result,
    debouncedQuery,
  }
}

export function useCompanyMedia(companyId: number | null) {
  const language = useLanguageStore((state) => state.language)

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.media.company(companyId ?? 0, language),
    queryFn: ({ pageParam }) =>
      discoverByCompany(companyId ?? 0, pageParam, TMDB_LANGUAGE_MAP[language]),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: companyId !== null,
    select: selectInfiniteMedia,
  })
}

export function usePersonMedia(personId: number | null) {
  const language = useLanguageStore((state) => state.language)

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.media.person(personId ?? 0, language),
    queryFn: () => getPersonCredits(personId ?? 0, TMDB_LANGUAGE_MAP[language]),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: personId !== null,
    select: selectInfiniteMedia,
  })
}
