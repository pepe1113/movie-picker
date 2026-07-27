import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieCard } from '@/components/features/movie/MovieCard'
import { cn } from '@/lib/utils'
import type { Movie } from '@/services/tmdb/types'

export interface AiPickerDisplayRecommendation {
  movie: Movie
  reason?: string
}

interface AiRecommendationCarouselProps {
  recommendations: AiPickerDisplayRecommendation[]
  shouldShowOverviewReasons: boolean
}

const AUTO_ADVANCE_MS = 4000

function getCircularOffset(index: number, activeIndex: number, total: number) {
  const rawOffset = index - activeIndex
  const half = total / 2

  if (rawOffset > half) return rawOffset - total
  if (rawOffset < -half) return rawOffset + total

  return rawOffset
}

function getSlideState(offset: number, reduceMotion: boolean) {
  if (offset === 0) {
    return {
      opacity: 1,
      scale: 1,
      x: '0%',
      zIndex: 30,
    }
  }

  if (offset === -1) {
    return {
      opacity: 0.58,
      scale: reduceMotion ? 0.92 : 0.82,
      x: reduceMotion ? '-48%' : '-74%',
      zIndex: 20,
    }
  }

  if (offset === 1) {
    return {
      opacity: 0.58,
      scale: reduceMotion ? 0.92 : 0.82,
      x: reduceMotion ? '48%' : '74%',
      zIndex: 20,
    }
  }

  return {
    opacity: 0,
    scale: 0.72,
    x: offset < 0 ? '-110%' : '110%',
    zIndex: 0,
  }
}

export function AiRecommendationCarousel({
  recommendations,
  shouldShowOverviewReasons,
}: AiRecommendationCarouselProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const hasLoopControls = recommendations.length > 1
  const activeIndex =
    recommendations.length === 0
      ? 0
      : Math.min(selectedIndex, recommendations.length - 1)

  const goToIndex = (index: number) => {
    if (recommendations.length === 0) return

    setSelectedIndex(
      ((index % recommendations.length) + recommendations.length) %
        recommendations.length,
    )
  }

  const goPrevious = () => {
    goToIndex(activeIndex - 1)
  }

  const goNext = () => {
    goToIndex(activeIndex + 1)
  }

  useEffect(() => {
    if (!hasLoopControls || isPaused || shouldReduceMotion) return

    const intervalId = window.setInterval(() => {
      setSelectedIndex((current) => (current + 1) % recommendations.length)
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(intervalId)
  }, [hasLoopControls, isPaused, recommendations.length, shouldReduceMotion])

  const activeRecommendation = recommendations[activeIndex]
  const activeReason = useMemo(() => {
    if (!activeRecommendation) return null
    if (activeRecommendation.reason) return activeRecommendation.reason
    if (shouldShowOverviewReasons) {
      return activeRecommendation.movie.overview || t('movieCard.noOverview')
    }

    return null
  }, [activeRecommendation, shouldShowOverviewReasons, t])

  if (recommendations.length === 0) return null

  return (
    <section
      aria-label={t('aiPicker.carousel.label')}
      className="space-y-5"
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative mx-auto flex min-h-[24rem] max-w-5xl items-center justify-center overflow-hidden px-8 sm:min-h-[29rem] md:px-16">
        {recommendations.map((recommendation, index) => {
          const offset = getCircularOffset(
            index,
            activeIndex,
            recommendations.length,
          )
          const slideState = getSlideState(offset, Boolean(shouldReduceMotion))
          const isActive = offset === 0
          const isClickableNeighbor = Math.abs(offset) === 1 && hasLoopControls

          return (
            <motion.div
              key={recommendation.movie.id}
              animate={slideState}
              initial={false}
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.42,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                'absolute w-[min(68vw,15.5rem)] sm:w-64',
                !isActive && 'brightness-75',
                Math.abs(offset) > 1 && 'pointer-events-none',
              )}
              aria-hidden={Math.abs(offset) > 1}
            >
              <div
                className={cn(
                  'relative transition-transform',
                  isClickableNeighbor && 'hover:scale-[1.02]',
                )}
              >
                <MovieCard
                  movie={recommendation.movie}
                  className={cn(
                    'shadow-[rgba(0,0,0,0.45)_0px_18px_36px]',
                    isActive &&
                      'shadow-[rgba(30,215,96,0.16)_0px_0px_0px_1px,rgba(0,0,0,0.58)_0px_26px_58px]',
                  )}
                />
                {isClickableNeighbor && (
                  <button
                    type="button"
                    onClick={() => goToIndex(index)}
                    aria-label={t('aiPicker.carousel.goTo', {
                      title: recommendation.movie.title,
                    })}
                    className="focus-visible:ring-primary focus-visible:ring-offset-background absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  />
                )}
              </div>
            </motion.div>
          )
        })}

        {hasLoopControls && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goPrevious}
              aria-label={t('aiPicker.carousel.previous')}
              className="absolute left-0 z-40 shadow-[rgba(0,0,0,0.5)_0px_8px_24px]"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goNext}
              aria-label={t('aiPicker.carousel.next')}
              className="absolute right-0 z-40 shadow-[rgba(0,0,0,0.5)_0px_8px_24px]"
            >
              <ChevronRight className="size-5" />
            </Button>
          </>
        )}
      </div>

      {hasLoopControls && (
        <div className="flex justify-center gap-2">
          {recommendations.map((recommendation, index) => (
            <motion.button
              key={recommendation.movie.id}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => goToIndex(index)}
              aria-label={t('aiPicker.carousel.goTo', {
                title: recommendation.movie.title,
              })}
              aria-current={index === activeIndex}
              className={cn(
                'focus-visible:ring-primary focus-visible:ring-offset-background h-2 rounded-full transition-[background-color,width] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                index === activeIndex
                  ? 'bg-primary w-7'
                  : 'bg-muted-foreground/45 hover:bg-muted-foreground w-2',
              )}
            />
          ))}
        </div>
      )}

      <div
        aria-label={t('aiPicker.carousel.reasonLabel')}
        className="border-border bg-secondary/70 mx-auto min-h-24 max-w-3xl overflow-hidden rounded-lg border p-4 shadow-[rgba(0,0,0,0.35)_0px_12px_28px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRecommendation.movie.id}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
            transition={{ duration: shouldReduceMotion ? 0.08 : 0.2 }}
            className="text-muted-foreground text-sm leading-relaxed"
          >
            {activeRecommendation.reason ??
              activeReason ??
              t('movieCard.noOverview')}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export function AiRecommendationCarouselSkeleton() {
  const { t } = useTranslation()

  return (
    <section aria-label={t('aiPicker.loading')} className="space-y-5">
      <div className="relative mx-auto flex min-h-[24rem] max-w-5xl items-center justify-center overflow-hidden px-8 sm:min-h-[29rem] md:px-16">
        <div className="absolute w-[min(58vw,12rem)] -translate-x-[74%] scale-[0.82] opacity-55 sm:w-56">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>

        <div className="absolute z-30 w-[min(68vw,15.5rem)] sm:w-64">
          <Skeleton className="aspect-[2/3] w-full rounded-lg shadow-[rgba(0,0,0,0.58)_0px_26px_58px]" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>

        <div className="absolute w-[min(58vw,12rem)] translate-x-[74%] scale-[0.82] opacity-55 sm:w-56">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>

        <Skeleton className="absolute left-0 z-40 size-11 rounded-full" />
        <Skeleton className="absolute right-0 z-40 size-11 rounded-full" />
      </div>

      <div className="flex justify-center gap-2">
        <Skeleton className="h-2 w-7 rounded-full" />
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="size-2 rounded-full" />
      </div>

      <div className="border-border bg-secondary/70 mx-auto min-h-24 max-w-3xl rounded-lg border p-4 shadow-[rgba(0,0,0,0.35)_0px_12px_28px]">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </section>
  )
}
