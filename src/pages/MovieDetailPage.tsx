import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Star,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx, type ClassValue } from 'clsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WishlistButton } from '@/components/features/wishlist/WishlistButton'
import { useMovieDetail } from '@/hooks/useMovieDetail'
import { getExternalRatings, getRegionalPosters } from '@/utils/movieDetail'
import {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  formatRating,
  formatYear,
  formatRuntime,
} from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'
import type { Movie } from '@/services/tmdb/types'
import type { RegionalPoster } from '@/utils/movieDetail'

export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()
  const movieId = Number(id)
  const { detail, credits, videos, images, omdb, isLoading, isError } =
    useMovieDetail(movieId)

  if (isError) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-6 px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">
          {t('movieDetail.notFound')}
        </h1>
        <Button variant="outline" asChild>
          <Link to={ROUTES.HOME}>
            <ArrowLeft className="size-4" />
            {t('movieDetail.backToHome')}
          </Link>
        </Button>
      </div>
    )
  }

  if (isLoading || !detail) {
    return <DetailSkeleton />
  }

  const trailer = videos?.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube',
  )
  const cast = credits?.cast.slice(0, 12) ?? []
  const regionalPosters = getRegionalPosters(images)
  const externalRatings = getExternalRatings(omdb)

  // Convert to Movie type for WishlistButton
  const movieForWishlist: Movie = {
    adult: detail.adult,
    backdrop_path: detail.backdrop_path,
    genre_ids: detail.genres.map((g) => g.id),
    id: detail.id,
    original_language: detail.original_language,
    original_title: detail.original_title,
    overview: detail.overview,
    popularity: detail.popularity,
    poster_path: detail.poster_path,
    release_date: detail.release_date,
    title: detail.title,
    video: detail.video,
    vote_average: detail.vote_average,
    vote_count: detail.vote_count,
  }

  return (
    <div className="min-h-screen pb-20">
      <section className="relative min-h-180 overflow-hidden">
        {detail.backdrop_path ? (
          <div className="absolute top-0 right-0 left-0">
            <img
              src={getBackdropUrl(detail.backdrop_path)}
              alt=""
              className="size-full object-cover"
            />
            <div className="from-background/95 via-background/45 absolute inset-0 bg-linear-to-r to-transparent" />
            <div className="from-background via-background/85 absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(30_215_96/0.22),transparent_32%),linear-gradient(135deg,var(--background)_0%,var(--muted)_48%,var(--background)_100%)]" />
        )}

        <div className="lg:px-16] relative container mx-auto flex min-h-180 flex-col px-6 py-8 md:px-12">
          <Button variant="ghost" size="sm" className="mb-8 self-start" asChild>
            <Link to={ROUTES.HOME}>
              <ArrowLeft className="size-4" />
              {t('movieDetail.backButton')}
            </Link>
          </Button>

          <div
            className={clsx([
              'mt-auto flex flex-col gap-8 pb-12 lg:flex-row',
              detail.backdrop_path && 'pt-64',
            ] as ClassValue[])}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="shrink-0"
            >
              <img
                src={getPosterUrl(detail.poster_path, 'large')}
                alt={detail.title}
                className="w-40 rounded-lg shadow-[rgba(0,0,0,0.5)_0px_8px_24px] md:w-56 lg:w-72"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="max-w-4xl flex-1 space-y-6"
            >
              <div className="space-y-4">
                <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
                  {detail.title}
                </h1>

                {detail.tagline && (
                  <p className="text-muted-foreground text-lg italic md:text-xl">
                    {detail.tagline}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge className="gap-2 px-3 py-1.5" variant="secondary">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  TMDB {formatRating(detail.vote_average)}
                  <span className="text-muted-foreground text-xs">
                    ({detail.vote_count.toLocaleString()})
                  </span>
                </Badge>
                {externalRatings.map((rating) => (
                  <Badge
                    key={rating.label}
                    className="gap-2 px-3 py-1.5"
                    variant="secondary"
                  >
                    {rating.label} {rating.value}
                  </Badge>
                ))}
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {formatYear(detail.release_date)}
                </span>
                {detail.runtime > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-2">
                      <Clock className="size-4" />
                      {formatRuntime(detail.runtime)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {detail.genres.map((genre) => (
                  <Badge key={genre.id} variant="outline">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4">
                <WishlistButton movie={movieForWishlist} size="lg" />
                {trailer && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        title={t('movieDetail.trailerTooltip')}
                      >
                        <Play className="size-5" />
                        {t('movieDetail.watchTrailer')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="max-w-5xl gap-5 p-4 sm:max-w-5xl"
                      showCloseButton
                    >
                      <DialogHeader className="pr-10">
                        <DialogTitle>{trailer.name}</DialogTitle>
                      </DialogHeader>
                      <div className="bg-background aspect-video overflow-hidden rounded-lg">
                        <iframe
                          src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                          title={trailer.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="size-full"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Overview */}
              {detail.overview && (
                <div className="border-border space-y-4 border-t pt-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">
                      {t('movieDetail.sections.overview')}
                    </h3>
                  </div>
                  <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed">
                    {detail.overview}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="container mx-auto space-y-20 px-6 py-20 md:px-12 lg:px-16">
        {/* Regional Posters */}
        {regionalPosters.length > 0 && (
          <section
            className="space-y-6"
            aria-labelledby="regional-posters-title"
          >
            <div className="space-y-2">
              <h2
                id="regional-posters-title"
                className="text-2xl font-bold md:text-3xl"
              >
                {t('movieDetail.sections.regionalPosters')}
              </h2>
            </div>

            <RegionalPostersCarousel posters={regionalPosters} />
          </section>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold md:text-3xl">
                {t('movieDetail.sections.cast')}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {cast.map((member) => (
                <div key={member.id} className="space-y-3 text-center">
                  <div className="bg-muted mx-auto aspect-square w-full overflow-hidden rounded-md">
                    <img
                      src={getProfileUrl(member.profile_path)}
                      alt={member.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="truncate text-sm leading-tight font-semibold">
                      {member.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.character}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Movie Info */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold md:text-3xl">
              {t('movieDetail.sections.info')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs tracking-[1.4px] uppercase">
                {t('movieDetail.info.originalTitle')}
              </p>
              <p className="font-semibold">{detail.original_title}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs tracking-[1.4px] uppercase">
                {t('movieDetail.info.status')}
              </p>
              <p className="font-semibold">{detail.status}</p>
            </div>
            {detail.budget > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs tracking-[1.4px] uppercase">
                  {t('movieDetail.info.budget')}
                </p>
                <p className="font-semibold">
                  ${detail.budget.toLocaleString()}
                </p>
              </div>
            )}
            {detail.revenue > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs tracking-[1.4px] uppercase">
                  {t('movieDetail.info.revenue')}
                </p>
                <p className="font-semibold">
                  ${detail.revenue.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function RegionalPostersCarousel({ posters }: { posters: RegionalPoster[] }) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>(
    'left',
  )
  const hasMultiplePosters = posters.length > 1
  const activePoster = posters[activeIndex]
  const visibleOffsets = posters.length === 1 ? [0] : [-1, 0, 1]

  useEffect(() => {
    if (!hasMultiplePosters) return

    const timer = window.setInterval(() => {
      setSlideDirection('left')
      setActiveIndex((currentIndex) =>
        getWrappedPosterIndex(currentIndex + 1, posters.length),
      )
    }, 2000)

    return () => window.clearInterval(timer)
  }, [hasMultiplePosters, posters.length])

  const showPreviousPoster = () => {
    setSlideDirection('right')
    setActiveIndex((currentIndex) =>
      getWrappedPosterIndex(currentIndex - 1, posters.length),
    )
  }

  const showNextPoster = () => {
    setSlideDirection('left')
    setActiveIndex((currentIndex) =>
      getWrappedPosterIndex(currentIndex + 1, posters.length),
    )
  }

  return (
    <div
      data-testid="regional-posters-carousel"
      data-slide-direction={slideDirection}
      className="space-y-5"
    >
      <div className="relative mx-auto h-[25rem] max-w-4xl overflow-hidden sm:h-[32rem] lg:h-[36rem]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-16 bg-linear-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-16 bg-linear-to-l from-background to-transparent" />

        {visibleOffsets.map((offset) => {
          const posterIndex = getWrappedPosterIndex(
            activeIndex + offset,
            posters.length,
          )
          const poster = posters[posterIndex]
          const isActive = offset === 0
          const positionClass =
            offset < 0
              ? '-translate-x-[120%]'
              : offset > 0
                ? 'translate-x-[20%]'
                : '-translate-x-1/2'

          return (
            <motion.div
              key={poster.region}
              initial={{ opacity: 0, y: '-46%' }}
              animate={{ opacity: isActive ? 1 : 0.38, y: '-50%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={clsx([
                'absolute top-1/2 left-1/2 aspect-[2/3] overflow-hidden rounded-lg bg-card shadow-[rgba(0,0,0,0.45)_0px_16px_32px]',
                'transition-[filter,transform,opacity] duration-500',
                positionClass,
                isActive
                  ? 'z-20 w-56 sm:w-72 lg:w-80'
                  : 'z-10 w-44 scale-75 opacity-35 blur-[4px] sm:w-60 lg:w-64',
              ] as ClassValue[])}
              aria-hidden={!isActive}
            >
              <img
                src={getPosterUrl(poster.file_path, 'large')}
                alt={isActive ? t(poster.labelKey) : ''}
                loading={isActive ? 'eager' : 'lazy'}
                className="size-full object-cover"
              />

              {isActive && (
                <Badge
                  data-testid="regional-poster-active-label"
                  className="absolute top-4 left-4 rounded-full border border-primary/50 bg-background/85 px-4 py-2 text-base font-black tracking-[1.4px] text-primary uppercase shadow-[rgba(0,0,0,0.5)_0px_8px_24px] backdrop-blur-md md:text-lg"
                >
                  {t(activePoster.labelKey)}
                </Badge>
              )}
            </motion.div>
          )
        })}

        {hasMultiplePosters && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 left-2 z-40 -translate-y-1/2 bg-background/70 text-foreground shadow-[rgba(0,0,0,0.5)_0px_8px_24px] backdrop-blur-md hover:bg-secondary/90 md:left-6"
              aria-label={t('movieDetail.regionalPosters.controls.previous')}
              onClick={showPreviousPoster}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 z-40 -translate-y-1/2 bg-background/70 text-foreground shadow-[rgba(0,0,0,0.5)_0px_8px_24px] backdrop-blur-md hover:bg-secondary/90 md:right-6"
              aria-label={t('movieDetail.regionalPosters.controls.next')}
              onClick={showNextPoster}
            >
              <ChevronRight className="size-5" />
            </Button>
          </>
        )}
      </div>

      {hasMultiplePosters && (
        <div className="flex justify-center gap-2">
          {posters.map((poster, index) => {
            const label = t(poster.labelKey)
            const isActive = index === activeIndex

            return (
              <button
                key={poster.region}
                type="button"
                className={clsx([
                  'h-2.5 rounded-full transition-all duration-300',
                  isActive
                    ? 'w-8 bg-primary'
                    : 'w-2.5 bg-muted-foreground/45 hover:bg-muted-foreground',
                ] as ClassValue[])}
                aria-label={t(
                  'movieDetail.regionalPosters.controls.showPoster',
                  {
                    region: label,
                  },
                )}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  setSlideDirection(index > activeIndex ? 'left' : 'right')
                  setActiveIndex(index)
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function getWrappedPosterIndex(index: number, length: number) {
  return ((index % length) + length) % length
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto space-y-12 px-6 py-12 md:px-12 lg:px-16">
      <div className="flex flex-col gap-12 lg:flex-row">
        <Skeleton className="h-96 w-full shrink-0 md:w-64 lg:w-80" />
        <div className="flex-1 space-y-6">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  )
}
