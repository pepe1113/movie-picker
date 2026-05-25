import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Calendar, Clock, Play } from 'lucide-react'
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
import { buildMovieDetailPresentation } from '@/utils/movieDetail'
import { buildTrailerEmbedUrl } from '@/utils/trailerMedia'
import {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  formatRating,
  formatYear,
  formatRuntime,
} from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()
  const movieId = Number(id)
  const { detail, credits, videos, omdb, isLoading, isError } =
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

  const { trailer, cast, externalRatings, movieForWishlist } =
    buildMovieDetailPresentation({ detail, credits, videos, omdb })

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
                <RatingPill
                  brand="tmdb"
                  label="TMDB"
                  value={formatRating(detail.vote_average)}
                  meta={`(${detail.vote_count.toLocaleString()})`}
                />
                {externalRatings.map((rating) => (
                  <RatingPill
                    key={rating.label}
                    brand={getRatingBrand(rating.label)}
                    label={rating.label}
                    value={rating.value}
                  />
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
                          src={buildTrailerEmbedUrl(trailer.key)}
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

type RatingBrand = 'tmdb' | 'imdb' | 'rotten-tomatoes'

interface RatingPillProps {
  brand: RatingBrand
  label: string
  value: string
  meta?: string
}

function RatingPill({ brand, label, value, meta }: RatingPillProps) {
  return (
    <div className="bg-card/90 flex min-h-16 items-center gap-3 rounded-full px-4 py-3 shadow-[rgba(0,0,0,0.3)_0px_8px_8px] ring-1 ring-white/10 backdrop-blur-sm">
      <RatingLogo brand={brand} label={label} />
      <div className="space-y-0.5 leading-none">
        <p className="text-muted-foreground text-[0.68rem] font-bold tracking-[1.4px] uppercase">
          {label}
        </p>
        <p className="text-2xl font-bold text-white md:text-3xl">
          {value}
          {meta && (
            <span className="text-muted-foreground ml-2 align-middle text-xs font-semibold">
              {meta}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function RatingLogo({
  brand,
  label,
}: {
  brand: RatingBrand
  label: string
}) {
  if (brand === 'imdb') {
    return (
      <span
        aria-label={`${label} logo`}
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#f5c518] text-[0.72rem] font-black tracking-tight text-black shadow-[rgba(0,0,0,0.35)_0px_4px_8px]"
      >
        IMDb
      </span>
    )
  }

  if (brand === 'rotten-tomatoes') {
    return (
      <span
        aria-label={`${label} logo`}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fa320a] shadow-[rgba(0,0,0,0.35)_0px_4px_8px]"
      >
        <svg
          viewBox="0 0 40 40"
          role="img"
          aria-hidden="true"
          className="size-8"
        >
          <path
            d="M20 12c5.8 0 10.5 4.3 10.5 10 0 6.4-4.6 11-10.5 11S9.5 28.4 9.5 22c0-5.7 4.7-10 10.5-10Z"
            fill="#e51b23"
          />
          <path
            d="M19.8 10.8c1.8-3.1 4.5-4 7.8-3.2-1 3-3.1 4.7-6.4 5.1 2.3.6 4.4 1.6 6.1 3.1-2.7.6-5 .1-7.1-1.7-1.8 1.6-4.2 2.2-7.1 1.7 1.8-1.6 3.9-2.7 6.7-3.2Z"
            fill="#2ebd59"
          />
          <circle cx="16" cy="21" r="1.4" fill="#ff7063" />
          <circle cx="23.5" cy="24.5" r="1.2" fill="#ff7063" />
        </svg>
      </span>
    )
  }

  return (
    <span
      aria-label={`${label} logo`}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#01b4e4] to-[#90cea1] text-[0.58rem] font-black tracking-tight text-[#052541] shadow-[rgba(0,0,0,0.35)_0px_4px_8px]"
    >
      TMDB
    </span>
  )
}

function getRatingBrand(label: string): RatingBrand {
  return label === 'Rotten Tomatoes' ? 'rotten-tomatoes' : 'imdb'
}
