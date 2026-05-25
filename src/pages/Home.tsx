import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AiMoviePicker } from '@/components/features/ai-picker/AiMoviePicker'
import { TypewriterHeroTitle } from '@/components/features/ai-picker/TypewriterHeroTitle'
import { MovieSection } from '@/components/features/movie/MovieSection'
import { Button } from '@/components/ui/button'
import { useMovies } from '@/hooks/useMovies'
import {
  getNextVisibleCount,
  shouldFetchNextMoviePage,
} from '@/utils/movieListBrowsing'

const SECTION_INCREMENT = 8

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
  const index = Math.floor(Math.random() * options.length)

  return options[index] ?? fallback
}

export function Component() {
  const { t } = useTranslation()
  const aiPickerRef = useRef<HTMLDivElement>(null)
  const movieSectionsRef = useRef<HTMLDivElement>(null)
  const [visibleCounts, setVisibleCounts] = useState({
    nowPlaying: SECTION_INCREMENT,
    trending: SECTION_INCREMENT,
    popular: SECTION_INCREMENT,
    topRated: SECTION_INCREMENT,
  })
  const nowPlaying = useMovies('now_playing')
  const trending = useMovies('trending')
  const popular = useMovies('popular')
  const topRated = useMovies('top_rated')
  const [heroTitle] = useState(() =>
    pickRandomHeroTitle(
      t('aiPicker.heroTitles', { returnObjects: true }),
      t('aiPicker.title'),
    ),
  )

  const loadMore = (
    key: keyof typeof visibleCounts,
    moviesLength: number,
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
        loadedCount: moviesLength,
        hasNextPage,
      })
    ) {
      fetchNextPage()
    }
  }

  const scrollToAiPicker = () => {
    aiPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToMovieSections = () => {
    movieSectionsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="min-h-screen">
      <section className="border-border relative flex min-h-[calc(100svh-104px)] overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(30,215,96,0.2),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(83,157,245,0.16),transparent_24%),linear-gradient(180deg,rgba(18,18,18,0.08),var(--background))]" />
        <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />
        <div className="from-background absolute right-0 bottom-0 left-0 h-36 bg-linear-to-t to-transparent" />

        <div className="relative container mx-auto flex w-full flex-col items-center justify-center px-6 py-10 text-center md:px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex w-full max-w-6xl flex-col items-center"
          >
            <div className="border-border/80 bg-secondary/45 text-muted-foreground mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[1.4px] uppercase shadow-[rgba(0,0,0,0.3)_0px_8px_8px] backdrop-blur">
              <Sparkles className="text-primary size-3.5" />
              {t('home.aiHero.badge')}
            </div>

            <TypewriterHeroTitle
              as="h1"
              title={heroTitle}
              className="max-w-5xl text-4xl md:text-6xl lg:text-7xl"
            />
            <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed md:text-lg">
              {t('home.aiHero.subtitle')}
            </p>

            <Button
              type="button"
              size="lg"
              onClick={scrollToAiPicker}
              className="mt-9"
            >
              {t('home.aiHero.cta')}
              <ChevronDown className="size-4" />
            </Button>

            <button
              type="button"
              onClick={scrollToAiPicker}
              className="text-muted-foreground hover:text-foreground mt-10 flex flex-col items-center gap-2 text-xs font-bold tracking-[1.4px] uppercase transition-colors"
            >
              <span>{t('home.aiHero.scrollHint')}</span>
              <ChevronDown className="text-primary size-7 animate-bounce" />
            </button>
          </motion.div>
        </div>
      </section>

      <div ref={aiPickerRef} className="scroll-mt-16">
        <AiMoviePicker onBrowseMovies={scrollToMovieSections} />
      </div>

      {/* Content Sections */}
      <div
        ref={movieSectionsRef}
        className="container mx-auto scroll-mt-16 space-y-14 px-6 py-14 md:px-12 md:py-16 lg:px-16"
      >
        {/* Now Playing Section */}
        <MovieSection
          title={t('home.sections.nowPlaying')}
          movies={nowPlaying.data?.movies ?? []}
          isLoading={nowPlaying.isLoading}
          limit={visibleCounts.nowPlaying}
          hasMore={
            visibleCounts.nowPlaying < (nowPlaying.data?.movies.length ?? 0) ||
            Boolean(nowPlaying.hasNextPage)
          }
          isLoadingMore={nowPlaying.isFetchingNextPage}
          onLoadMore={() =>
            loadMore(
              'nowPlaying',
              nowPlaying.data?.movies.length ?? 0,
              () => void nowPlaying.fetchNextPage(),
              nowPlaying.hasNextPage,
            )
          }
          sectionLabel={t('home.sections.nowPlayingLabel')}
          enableTrailerPreview
        />

        {/* Trending Section */}
        <MovieSection
          title={t('home.sections.trending')}
          movies={trending.data?.movies ?? []}
          isLoading={trending.isLoading}
          limit={visibleCounts.trending}
          hasMore={
            visibleCounts.trending < (trending.data?.movies.length ?? 0) ||
            Boolean(trending.hasNextPage)
          }
          isLoadingMore={trending.isFetchingNextPage}
          onLoadMore={() =>
            loadMore(
              'trending',
              trending.data?.movies.length ?? 0,
              () => void trending.fetchNextPage(),
              trending.hasNextPage,
            )
          }
          sectionLabel={t('home.sections.trendingLabel')}
          enableTrailerPreview
        />

        {/* Popular Section */}
        <MovieSection
          title={t('home.sections.popular')}
          movies={popular.data?.movies ?? []}
          isLoading={popular.isLoading}
          limit={visibleCounts.popular}
          hasMore={
            visibleCounts.popular < (popular.data?.movies.length ?? 0) ||
            Boolean(popular.hasNextPage)
          }
          isLoadingMore={popular.isFetchingNextPage}
          onLoadMore={() =>
            loadMore(
              'popular',
              popular.data?.movies.length ?? 0,
              () => void popular.fetchNextPage(),
              popular.hasNextPage,
            )
          }
          sectionLabel={t('home.sections.popularLabel')}
          enableTrailerPreview
        />

        {/* Top Rated Section */}
        <MovieSection
          title={t('home.sections.topRated')}
          movies={topRated.data?.movies ?? []}
          isLoading={topRated.isLoading}
          limit={visibleCounts.topRated}
          hasMore={
            visibleCounts.topRated < (topRated.data?.movies.length ?? 0) ||
            Boolean(topRated.hasNextPage)
          }
          isLoadingMore={topRated.isFetchingNextPage}
          onLoadMore={() =>
            loadMore(
              'topRated',
              topRated.data?.movies.length ?? 0,
              () => void topRated.fetchNextPage(),
              topRated.hasNextPage,
            )
          }
          sectionLabel={t('home.sections.topRatedLabel')}
          enableTrailerPreview
        />
      </div>
    </div>
  )
}
