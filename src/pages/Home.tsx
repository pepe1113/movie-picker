import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiMoviePicker } from '@/components/features/ai-picker/AiMoviePicker'
import { MovieSection } from '@/components/features/movie/MovieSection'
import { useMovies } from '@/hooks/useMovies'

const SECTION_INCREMENT = 8

export function Component() {
  const { t } = useTranslation()
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

  const loadMore = (
    key: keyof typeof visibleCounts,
    moviesLength: number,
    fetchNextPage: () => void,
    hasNextPage?: boolean,
  ) => {
    setVisibleCounts((current) => ({
      ...current,
      [key]: current[key] + SECTION_INCREMENT,
    }))

    if (visibleCounts[key] + SECTION_INCREMENT >= moviesLength && hasNextPage) {
      fetchNextPage()
    }
  }

  return (
    <div className="min-h-screen">
      <AiMoviePicker />

      {/* Content Sections */}
      <div className="container mx-auto space-y-14 px-6 py-14 md:px-12 md:py-16 lg:px-16">
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
        />
      </div>
    </div>
  )
}
