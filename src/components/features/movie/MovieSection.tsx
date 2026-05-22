import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MovieCard } from './MovieCard'
import { MovieSkeleton } from './MovieSkeleton'
import type { Movie } from '@/services/tmdb/types'

interface MovieSectionProps {
  title: string
  subtitle?: string
  movies: Movie[]
  isLoading?: boolean
  limit?: number
  moreLink?: string
  moreLinkText?: string
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  loadMoreText?: string
  sectionLabel?: string
}

export function MovieSection({
  title,
  subtitle,
  movies,
  isLoading = false,
  limit,
  moreLink,
  moreLinkText,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  loadMoreText,
  sectionLabel,
}: MovieSectionProps) {
  const { t } = useTranslation()
  const displayMovies = limit ? movies.slice(0, limit) : movies
  const linkText = moreLinkText || t('movieSection.viewMore')
  const buttonText = loadMoreText || t('movieSection.viewMore')

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

          {moreLink && (
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to={moreLink}>
                {linkText}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Movie Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: limit ?? 12 }).map((_, i) => (
              <MovieSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {displayMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
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
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* Mobile "More" link */}
        {moreLink && (
          <div className="md:hidden">
            <Button variant="ghost" asChild className="w-full">
              <Link to={moreLink}>
                {linkText}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
