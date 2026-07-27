import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AiMoviePicker } from '@/components/features/ai-picker/AiMoviePicker'
import { TypewriterHeroTitle } from '@/components/features/ai-picker/TypewriterHeroTitle'
import { MovieGrid } from '@/components/features/movie/MovieGrid'
import { MovieSection } from '@/components/features/movie/MovieSection'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDiscoverMedia } from '@/hooks/useDiscoverMedia'
import { useMediaList } from '@/hooks/useMovies'
import { useLanguageStore } from '@/stores/languageStore'
import { getGenres, getTvGenres } from '@/services/tmdb/api'
import type { MediaType } from '@/services/tmdb/types'
import { QUERY_KEYS, TMDB_LANGUAGE_MAP } from '@/utils/constants'
import { getBackdropUrl } from '@/utils/helpers'
import {
  getNextVisibleCount,
  shouldFetchNextMoviePage,
} from '@/utils/movieListBrowsing'

const SECTION_INCREMENT = 12
const INITIAL_COUNTS = {
  latest: SECTION_INCREMENT,
  trending: SECTION_INCREMENT,
  popular: SECTION_INCREMENT,
  topRated: SECTION_INCREMENT,
}

function getHeroTitleOptions(value: unknown, fallback: string) {
  if (!Array.isArray(value)) return [fallback]

  const options = value.filter(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  )

  return options.length > 0 ? options : [fallback]
}

function pickRandomHeroTitle(value: unknown, fallback: string) {
  const options = getHeroTitleOptions(value, fallback)
  return options[Math.floor(Math.random() * options.length)] ?? fallback
}

export function Component() {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const aiPickerRef = useRef<HTMLDivElement>(null)
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [selectedGenres, setSelectedGenres] = useState<
    Record<MediaType, number | null>
  >({ movie: null, tv: null })
  const [visibleCounts, setVisibleCounts] = useState(INITIAL_COUNTS)
  const latest = useMediaList(mediaType, 'latest')
  const trending = useMediaList(mediaType, 'trending')
  const popular = useMediaList(mediaType, 'popular')
  const topRated = useMediaList(mediaType, 'top_rated')
  const selectedGenre = selectedGenres[mediaType]
  const genreResults = useDiscoverMedia(mediaType, selectedGenre)
  const { data: genres = [] } = useQuery({
    queryKey: QUERY_KEYS.media.genres(mediaType, language),
    queryFn: () =>
      mediaType === 'movie'
        ? getGenres(TMDB_LANGUAGE_MAP[language])
        : getTvGenres(TMDB_LANGUAGE_MAP[language]),
  })
  const [heroTitle] = useState(() =>
    pickRandomHeroTitle(
      t('aiPicker.heroTitles', { returnObjects: true }),
      t('aiPicker.title'),
    ),
  )
  const heroBackdrop = latest.data?.media.find(
    (item) => item.backdrop_path,
  )?.backdrop_path

  const loadMore = (
    key: keyof typeof visibleCounts,
    loadedCount: number,
    fetchNextPage: () => void,
    hasNextPage?: boolean,
  ) => {
    setVisibleCounts((current) => ({
      ...current,
      [key]: getNextVisibleCount(current[key], SECTION_INCREMENT),
    }))

    if (
      shouldFetchNextMoviePage({
        visibleCount: visibleCounts[key],
        increment: SECTION_INCREMENT,
        loadedCount,
        hasNextPage,
      })
    ) {
      fetchNextPage()
    }
  }

  const changeMediaType = (value: string) => {
    setMediaType(value as MediaType)
    setVisibleCounts(INITIAL_COUNTS)
  }

  return (
    <div className="h-[calc(100dvh-64px)] snap-y snap-mandatory overflow-y-auto scroll-smooth">
      <section className="border-border relative flex min-h-full snap-start snap-always overflow-hidden border-b">
        {heroBackdrop && (
          <img
            src={getBackdropUrl(heroBackdrop)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(11_11_14/0.98)_0%,rgb(11_11_14/0.82)_48%,rgb(11_11_14/0.38)_100%),radial-gradient(circle_at_78%_28%,rgb(214_43_66/0.24),transparent_36%)]" />
        <div className="from-background absolute inset-x-0 bottom-0 h-36 bg-linear-to-t to-transparent" />

        <div className="relative container mx-auto flex w-full items-center px-6 py-10 md:px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex w-full max-w-4xl flex-col items-start"
          >
            <div className="border-border/80 bg-secondary/70 text-muted-foreground mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[1.4px] uppercase backdrop-blur">
              <Sparkles className="text-primary size-3.5" />
              {t('home.aiHero.badge')}
            </div>

            <TypewriterHeroTitle
              as="h1"
              title={heroTitle}
              className="mx-0 max-w-4xl text-left"
            />
            <p className="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed md:text-lg">
              {t('home.aiHero.subtitle')}
            </p>

            <Button
              type="button"
              size="lg"
              onClick={() =>
                aiPickerRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
              className="mt-9"
            >
              {t('home.aiHero.cta')}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      <div ref={aiPickerRef} className="snap-start snap-always">
        <AiMoviePicker />
      </div>

      <div className="container mx-auto snap-start space-y-10 px-6 py-14 md:px-12 md:py-16 lg:px-16">
        <Tabs value={mediaType} onValueChange={changeMediaType}>
          <TabsList className="bg-secondary rounded-full p-1">
            <TabsTrigger value="movie" className="rounded-full px-6">
              {t('mediaType.movies')}
            </TabsTrigger>
            <TabsTrigger value="tv" className="rounded-full px-6">
              {t('mediaType.tvShows')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div
          className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t('genres.label')}
        >
          <Button
            type="button"
            size="sm"
            variant={selectedGenre === null ? 'default' : 'outline'}
            onClick={() =>
              setSelectedGenres((current) => ({
                ...current,
                [mediaType]: null,
              }))
            }
          >
            {t('genres.all')}
          </Button>
          {genres.map((genre) => (
            <Button
              key={genre.id}
              type="button"
              size="sm"
              variant={selectedGenre === genre.id ? 'default' : 'outline'}
              onClick={() =>
                setSelectedGenres((current) => ({
                  ...current,
                  [mediaType]: genre.id,
                }))
              }
            >
              {genre.name}
            </Button>
          ))}
        </div>

        {selectedGenre !== null ? (
          <MovieGrid
            movies={genreResults.data?.media ?? []}
            isLoading={genreResults.isLoading}
            hasNextPage={genreResults.hasNextPage}
            isFetchingNextPage={genreResults.isFetchingNextPage}
            onLoadMore={() => void genreResults.fetchNextPage()}
          />
        ) : (
          <div className="space-y-14">
            <MovieSection
              title={t(`home.sections.${mediaType}.latest`)}
              movies={latest.data?.media ?? []}
              isLoading={latest.isLoading}
              limit={visibleCounts.latest}
              hasMore={
                visibleCounts.latest < (latest.data?.media.length ?? 0) ||
                Boolean(latest.hasNextPage)
              }
              isLoadingMore={latest.isFetchingNextPage}
              onLoadMore={() =>
                loadMore(
                  'latest',
                  latest.data?.media.length ?? 0,
                  () => void latest.fetchNextPage(),
                  latest.hasNextPage,
                )
              }
            />

            <MovieSection
              title={t(`home.sections.${mediaType}.trending`)}
              movies={trending.data?.media ?? []}
              isLoading={trending.isLoading}
              limit={visibleCounts.trending}
              hasMore={
                visibleCounts.trending < (trending.data?.media.length ?? 0) ||
                Boolean(trending.hasNextPage)
              }
              isLoadingMore={trending.isFetchingNextPage}
              onLoadMore={() =>
                loadMore(
                  'trending',
                  trending.data?.media.length ?? 0,
                  () => void trending.fetchNextPage(),
                  trending.hasNextPage,
                )
              }
            />

            <MovieSection
              title={t(`home.sections.${mediaType}.popular`)}
              movies={popular.data?.media ?? []}
              isLoading={popular.isLoading}
              limit={visibleCounts.popular}
              hasMore={
                visibleCounts.popular < (popular.data?.media.length ?? 0) ||
                Boolean(popular.hasNextPage)
              }
              isLoadingMore={popular.isFetchingNextPage}
              onLoadMore={() =>
                loadMore(
                  'popular',
                  popular.data?.media.length ?? 0,
                  () => void popular.fetchNextPage(),
                  popular.hasNextPage,
                )
              }
            />

            <MovieSection
              title={t(`home.sections.${mediaType}.topRated`)}
              movies={topRated.data?.media ?? []}
              isLoading={topRated.isLoading}
              limit={visibleCounts.topRated}
              hasMore={
                visibleCounts.topRated < (topRated.data?.media.length ?? 0) ||
                Boolean(topRated.hasNextPage)
              }
              isLoadingMore={topRated.isFetchingNextPage}
              onLoadMore={() =>
                loadMore(
                  'topRated',
                  topRated.data?.media.length ?? 0,
                  () => void topRated.fetchNextPage(),
                  topRated.hasNextPage,
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
