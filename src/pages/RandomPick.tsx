import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Dice5, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WishlistButton } from '@/components/features/wishlist/WishlistButton'
import { FilterPanel } from '@/components/features/filter/FilterPanel'
import { useMovies } from '@/hooks/useMovies'
import { useDiscoverMovies } from '@/hooks/useDiscoverMovies'
import { getPosterUrl, formatRating, formatYear } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'
import type { Movie } from '@/services/tmdb/types'

function pickRandom(movies: Movie[], count: number): Movie[] {
  const shuffled = [...movies].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function Component() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'random' | 'filtered'>('random')
  const [picks, setPicks] = useState<Movie[]>([])
  const [hasRolled, setHasRolled] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [noResults, setNoResults] = useState(false)

  // Fetch data for both modes
  const { data: popularData, isLoading: isLoadingPopular } =
    useMovies('popular')
  const {
    data: filteredData,
    isLoading: isLoadingFiltered,
    refetch: refetchFiltered,
  } = useDiscoverMovies({ enabled: false })

  const allMovies = useMemo(
    () =>
      mode === 'random'
        ? (popularData?.movies ?? [])
        : (filteredData?.movies ?? []),
    [mode, popularData?.movies, filteredData?.movies],
  )

  const isLoading = mode === 'random' ? isLoadingPopular : isLoadingFiltered

  const handleModeChange = useCallback((newMode: 'random' | 'filtered') => {
    setMode(newMode)
    setNoResults(false)
    setPicks([])
    setHasRolled(false)
  }, [])

  const roll = useCallback(async () => {
    setIsRolling(true)
    setNoResults(false)

    // For filtered mode, refetch with current filter settings
    if (mode === 'filtered') {
      const result = await refetchFiltered()
      const movies = result.data?.movies ?? []
      if (movies.length > 0) {
        setPicks(pickRandom(movies, 3))
        setHasRolled(true)
      } else {
        // No results found
        setNoResults(true)
        setPicks([])
        setHasRolled(false)
      }
    } else {
      // For random mode, use existing data
      if (allMovies.length > 0) {
        setPicks(pickRandom(allMovies, 3))
        setHasRolled(true)
      }
    }

    // Stop rolling animation after 600ms
    setTimeout(() => setIsRolling(false), 600)
  }, [mode, refetchFiltered, allMovies])

  return (
    <div className="min-h-screen pb-20">
      <section className="border-border relative overflow-hidden border-b">
        <div className="relative container mx-auto px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl space-y-6"
          >
            <span className="bg-primary text-primary-foreground inline-flex size-12 items-center justify-center rounded-full shadow-[rgba(0,0,0,0.5)_0px_8px_24px]">
              <Dice5 className="size-6" />
            </span>
            <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
              {t('random.title')}
            </h1>

            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed md:text-lg">
              {t('random.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 md:px-12 md:py-16 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-12">
          <Tabs
            value={mode}
            onValueChange={(v) => handleModeChange(v as typeof mode)}
          >
            <div className="flex justify-center">
              <TabsList className="bg-secondary rounded-full p-1 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
                <TabsTrigger
                  value="random"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-5 text-xs font-bold tracking-[1.4px] uppercase"
                >
                  {t('random.modes.random')}
                </TabsTrigger>
                <TabsTrigger
                  value="filtered"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-5 text-xs font-bold tracking-[1.4px] uppercase"
                >
                  {t('random.modes.filtered')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Random Mode */}
            <TabsContent value="random" className="mt-12">
              <div className="space-y-8 text-center">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {t('random.descriptions.random')}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Filtered Mode */}
            <TabsContent value="filtered" className="mt-12">
              <div className="space-y-8">
                <div className="space-y-2 text-center">
                  <p className="text-muted-foreground text-sm">
                    {t('random.descriptions.filtered')}
                  </p>
                </div>
                <div className="bg-card mx-auto max-w-md rounded-lg p-5 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
                  <FilterPanel />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Roll Button - Big and Bold */}
          <div className="flex justify-center py-8">
            <Button
              size="lg"
              onClick={roll}
              disabled={isLoading}
              className="h-16 gap-4 px-9 text-sm"
            >
              <motion.div
                animate={
                  isRolling
                    ? {
                        rotate: [0, 90, 180, 270, 360],
                        scale: [1, 1.2, 1, 1.2, 1],
                      }
                    : {}
                }
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <Dice5 className="size-8" />
              </motion.div>
              {hasRolled
                ? t('random.buttons.rollAgain')
                : t('random.buttons.roll')}
            </Button>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-full" />
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence mode="wait">
            {picks.length > 0 && (
              <motion.div
                key={picks.map((p) => p.id).join('-')}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <div className="space-y-8">
                  <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-bold md:text-3xl">
                      {t('random.results.title')}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {picks.map((movie, index) => (
                      <motion.div
                        key={movie.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 }}
                        className="group relative"
                      >
                        <Link to={ROUTES.MOVIE_DETAIL(movie.id)}>
                          <div className="bg-muted relative aspect-[2/3] overflow-hidden rounded-lg shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
                            <img
                              src={getPosterUrl(movie.poster_path, 'large')}
                              alt={movie.title}
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Info overlay */}
                            <div className="bg-background/95 absolute inset-x-0 bottom-0 space-y-3 p-5 backdrop-blur-sm">
                              <h3 className="text-base leading-tight font-bold">
                                {movie.title}
                              </h3>
                              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1">
                                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                                  {formatRating(movie.vote_average)}
                                </span>
                                <span className="text-border">|</span>
                                <span>{formatYear(movie.release_date)}</span>
                              </div>
                              {movie.overview && (
                                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                                  {movie.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>

                        {/* Wishlist button */}
                        <div className="absolute top-4 right-4">
                          <WishlistButton movie={movie} />
                        </div>

                        <div className="bg-primary text-primary-foreground absolute top-4 left-4 flex size-10 items-center justify-center rounded-full text-sm font-bold shadow-[rgba(0,0,0,0.5)_0px_8px_24px]">
                          {index + 1}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {noResults && !isLoading && (
            <div className="space-y-6 py-20 text-center">
              <span className="bg-secondary text-muted-foreground mx-auto flex size-20 items-center justify-center rounded-full">
                <Dice5 className="size-10 stroke-1" />
              </span>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">
                  {t('random.noResults.title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('random.noResults.description')}
                </p>
              </div>
            </div>
          )}

          {/* Initial State */}
          {!hasRolled && !isLoading && !noResults && (
            <div className="text-muted-foreground space-y-6 py-20 text-center">
              <Dice5 className="mx-auto size-24 stroke-1" />
              <p className="text-lg">{t('random.initial')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
