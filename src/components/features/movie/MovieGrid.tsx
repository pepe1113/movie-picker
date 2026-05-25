import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MovieCard } from './MovieCard'
import { MovieSkeleton } from './MovieSkeleton'
import type { Movie } from '@/services/tmdb/types'

interface MovieGridProps {
  movies: Movie[]
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  emptyMessage?: string
  skeletonCount?: number
}

export function MovieGrid({
  movies,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  emptyMessage,
  skeletonCount = 12,
}: MovieGridProps) {
  const { t } = useTranslation()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const defaultEmptyMessage = emptyMessage || t('movieGrid.noMovies')

  // IntersectionObserver 無限滾動
  useEffect(() => {
    if (!hasNextPage || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )

    const el = loadMoreRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // 初始 Loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MovieSkeleton key={i} />
        ))}
      </div>
    )
  }

  // 空狀態
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">{defaultEmptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}

        {/* 載入更多 Skeleton */}
        {isFetchingNextPage &&
          Array.from({ length: 5 }).map((_, i) => (
            <MovieSkeleton key={`loading-${i}`} />
          ))}
      </div>

      {/* 無限滾動觸發點 */}
      {hasNextPage && <div ref={loadMoreRef} className="h-10" />}
    </>
  )
}
