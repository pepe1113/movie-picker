import { ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MovieCard } from './MovieCard'
import { MovieSkeleton } from './MovieSkeleton'
import type { MediaItem } from '@/services/tmdb/types'
import { getMediaKey } from '@/utils/media'

interface MovieSectionProps {
  title: string
  subtitle?: string
  movies: MediaItem[]
  isLoading?: boolean
  limit?: number
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  sectionLabel?: string
}

export function MovieSection({
  title,
  subtitle,
  movies,
  isLoading = false,
  limit,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  sectionLabel,
}: MovieSectionProps) {
  const { t } = useTranslation()
  const displayMovies = limit ? movies.slice(0, limit) : movies
  const buttonText = t('movieSection.viewMore')

  return (
    <section className="relative">
      <div className="relative space-y-8">
        {/* Section Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            {sectionLabel && (
              <p className="text-primary text-xs font-bold tracking-[1.6px] uppercase">
                {sectionLabel}
              </p>
            )}
            <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground text-base md:text-lg">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Movie Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: limit ?? 12 }).map((_, i) => (
              <MovieSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {displayMovies.map((movie) => (
              <MovieCard key={getMediaKey(movie)} movie={movie} />
            ))}
          </div>
        )}

        {hasMore && onLoadMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? t('common.loading') : buttonText}
              <ArrowDown className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
