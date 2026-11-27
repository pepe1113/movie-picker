import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MovieGrid } from '@/components/features/movie/MovieGrid'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompanyMedia, useSearch } from '@/hooks/useSearch'
import type { MediaType } from '@/services/tmdb/types'
import { getMediaType } from '@/utils/media'

interface SearchResultsProps {
  query: string
  companyId?: number | null
}

export function SearchResults({ query, companyId = null }: SearchResultsProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<'all' | MediaType>('all')
  const search = useSearch(query, { enabled: companyId === null })
  const company = useCompanyMedia(companyId)
  const { debouncedQuery } = search
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    companyId === null ? search : company

  if (!debouncedQuery) return null

  const media = data?.media ?? []
  const filteredMedia =
    filter === 'all'
      ? media
      : media.filter((item) => getMediaType(item) === filter)

  return (
    <div className="space-y-4">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as typeof filter)}
      >
        <TabsList className="bg-secondary rounded-full p-1">
          <TabsTrigger value="all" className="rounded-full">
            {t('searchResults.filters.all')}
          </TabsTrigger>
          <TabsTrigger value="movie" className="rounded-full">
            {t('mediaType.movies')}
          </TabsTrigger>
          <TabsTrigger value="tv" className="rounded-full">
            {t('mediaType.tvShows')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {data && (
        <p className="text-muted-foreground text-sm">
          {t('searchResults.found', { count: filteredMedia.length })}
        </p>
      )}
      <MovieGrid
        movies={filteredMedia}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        emptyMessage={t('searchResults.notFound', { query: debouncedQuery })}
      />
    </div>
  )
}
