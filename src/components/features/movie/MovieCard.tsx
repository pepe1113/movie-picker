import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { WishlistButton } from '@/components/features/wishlist/WishlistButton'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/services/tmdb/types'
import { formatRating, formatYear, getPosterUrl } from '@/utils/helpers'
import {
  getMediaDate,
  getMediaDetailPath,
  getMediaTitle,
  getMediaType,
} from '@/utils/media'

interface MovieCardProps {
  movie: MediaItem
  className?: string
}

export function MovieCard({ movie, className }: MovieCardProps) {
  const { t } = useTranslation()
  const title = getMediaTitle(movie)
  const mediaType = getMediaType(movie)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3 }}
      className={cn('group relative [perspective:1000px]', className)}
    >
      <Link
        to={getMediaDetailPath(movie)}
        className="poster-card-flip bg-card hover:bg-muted block overflow-hidden rounded-lg transition-colors"
      >
        <div className="bg-muted relative aspect-[2/3] overflow-hidden">
          <img
            src={getPosterUrl(movie.poster_path)}
            alt={title}
            loading="lazy"
            className="size-full object-cover"
          />

          <div className="from-background via-background/55 absolute inset-0 flex flex-col justify-end bg-gradient-to-t to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="text-foreground/90 line-clamp-3 text-xs leading-relaxed">
              {movie.overview || t('movieCard.noOverview')}
            </p>
          </div>
        </div>

        <div className="space-y-1 p-3">
          <h3 className="truncate text-sm leading-tight font-bold">{title}</h3>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span>{formatYear(getMediaDate(movie))}</span>
            <span aria-hidden="true">/</span>
            <span>{t(`mediaType.${mediaType}`)}</span>
            <span className="ml-auto flex items-center gap-1">
              <Star className="size-3 fill-current text-[#eab308]" />
              {formatRating(movie.vote_average)}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-3">
        <WishlistButton movie={movie} />
      </div>
    </motion.article>
  )
}
