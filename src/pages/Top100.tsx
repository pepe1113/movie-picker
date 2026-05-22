import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { WishlistButton } from '@/components/features/wishlist/WishlistButton'
import { useMovies } from '@/hooks/useMovies'
import { getPosterUrl, formatRating, formatYear } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

export function Component() {
  const { t } = useTranslation()
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMovies('top_rated')

  const movies = data?.movies ?? []

  return (
    <div className="container mx-auto space-y-8 px-6 py-10 md:px-12 lg:px-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{t('top100.title')}</h1>
        <p className="text-muted-foreground">{t('top100.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {movies.slice(0, 100).map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.5) }}
            >
              <Link
                to={ROUTES.MOVIE_DETAIL(movie.id)}
                className="bg-card hover:bg-muted flex items-center gap-4 rounded-lg p-3 shadow-[rgba(0,0,0,0.25)_0px_4px_12px] transition-[background-color,transform]"
              >
                {/* 排名 */}
                <span className="text-muted-foreground w-8 text-center text-lg font-bold">
                  {index + 1}
                </span>

                {/* 海報 */}
                <img
                  src={getPosterUrl(movie.poster_path, 'small')}
                  alt={movie.title}
                  loading="lazy"
                  className="h-20 w-14 rounded-md object-cover"
                />

                {/* 資訊 */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{movie.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {formatYear(movie.release_date)}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                    {movie.overview}
                  </p>
                </div>

                {/* 評分 */}
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  {formatRating(movie.vote_average)}
                </Badge>

                {/* 收藏 */}
                <div className="shrink-0">
                  <WishlistButton movie={movie} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* 載入更多 */}
      {hasNextPage && movies.length < 100 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            {isFetchingNextPage ? t('top100.loading') : t('top100.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
