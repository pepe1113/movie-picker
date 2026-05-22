import { useTranslation } from 'react-i18next'
import { AiMoviePicker } from '@/components/features/ai-picker/AiMoviePicker'
import { MovieSection } from '@/components/features/movie/MovieSection'
import { useMovies } from '@/hooks/useMovies'

export function Component() {
  const { t } = useTranslation()
  const trending = useMovies('trending')
  const popular = useMovies('popular')
  const topRated = useMovies('top_rated')

  return (
    <div className="min-h-screen">
      <AiMoviePicker />

      {/* Content Sections */}
      <div className="container mx-auto space-y-14 px-6 py-14 md:px-12 md:py-16 lg:px-16">
        {/* Trending Section */}
        <MovieSection
          title={t('home.sections.trending')}
          movies={trending.data?.movies ?? []}
          isLoading={trending.isLoading}
          limit={8}
          sectionLabel={t('home.sections.trendingLabel')}
        />

        {/* Popular Section */}
        <MovieSection
          title={t('home.sections.popular')}
          movies={popular.data?.movies ?? []}
          isLoading={popular.isLoading}
          limit={8}
          sectionLabel={t('home.sections.popularLabel')}
        />

        {/* Top Rated Section */}
        <MovieSection
          title={t('home.sections.topRated')}
          movies={topRated.data?.movies ?? []}
          isLoading={topRated.isLoading}
          limit={8}
          moreLink="/top100"
          moreLinkText={t('home.sections.viewAll')}
          sectionLabel={t('home.sections.topRatedLabel')}
        />
      </div>
    </div>
  )
}
