import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { WishlistButton } from '@/components/features/wishlist/WishlistButton'
import { getMovieVideos } from '@/services/tmdb/api'
import { cn } from '@/lib/utils'
import { getPosterUrl, formatRating, formatYear } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'
import type { Movie } from '@/services/tmdb/types'

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const { t } = useTranslation()
  const [isHovering, setIsHovering] = useState(false)
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canPreviewRef = useRef(false)

  useEffect(() => {
    canPreviewRef.current = window.matchMedia('(min-width: 768px)').matches

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const videosQuery = useQuery({
    queryKey: ['movie-card-trailer', movie.id],
    queryFn: () => getMovieVideos(movie.id),
    enabled: shouldLoadPreview,
    staleTime: 1000 * 60 * 30,
  })

  const trailer = videosQuery.data?.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  )
  const isPlayingPreview = isHovering && Boolean(trailer)
  const previewParams = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    loop: '1',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    showinfo: '0',
  })

  if (trailer) {
    previewParams.set('playlist', trailer.key)
  }

  const handlePreviewEnter = () => {
    if (!canPreviewRef.current) return

    setIsHovering(true)
    hoverTimerRef.current = setTimeout(() => {
      setShouldLoadPreview(true)
    }, 450)
  }

  const handlePreviewLeave = () => {
    setIsHovering(false)

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3 }}
      className="group bg-card hover:bg-muted relative rounded-lg p-3 transition-[background-color,transform,box-shadow] hover:shadow-[rgba(0,0,0,0.3)_0px_8px_8px]"
      onMouseEnter={handlePreviewEnter}
      onMouseLeave={handlePreviewLeave}
    >
      <Link to={ROUTES.MOVIE_DETAIL(movie.id)} className="block">
        <div className="bg-muted relative aspect-[2/3] overflow-hidden rounded-md">
          <img
            src={getPosterUrl(movie.poster_path)}
            alt={movie.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {isHovering && trailer && (
            <div className="absolute inset-0 hidden overflow-hidden bg-black md:block">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?${previewParams.toString()}`}
                title=""
                aria-hidden="true"
                allow="autoplay; encrypted-media"
                className="pointer-events-none absolute top-1/2 left-1/2 h-full w-[267%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </div>
          )}

          {!trailer && (
            <div className="from-background via-background/50 absolute inset-0 flex flex-col justify-end bg-gradient-to-t to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <p className="text-foreground/90 line-clamp-3 text-xs leading-relaxed">
                {movie.overview || t('movieCard.noOverview')}
              </p>
            </div>
          )}

          {!isPlayingPreview && (
            <Badge className="absolute top-3 left-3 gap-1" variant="secondary">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {formatRating(movie.vote_average)}
            </Badge>
          )}
        </div>

        {/* Info - Increased spacing */}
        <div className="mt-3 space-y-1">
          <h3 className="truncate text-sm leading-tight font-bold">
            {movie.title}
          </h3>
          <p className="text-muted-foreground text-xs">
            {formatYear(movie.release_date)}
          </p>
        </div>
      </Link>

      {/* Wishlist Button - Always visible on mobile, hover on desktop */}
      <div
        className={cn(
          'absolute top-5 right-5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100',
          isPlayingPreview && 'md:group-hover:opacity-0',
        )}
      >
        <WishlistButton movie={movie} />
      </div>
    </motion.div>
  )
}
