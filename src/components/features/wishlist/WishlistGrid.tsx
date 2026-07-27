import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MovieGrid } from '@/components/features/movie/MovieGrid'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MediaType } from '@/services/tmdb/types'
import { useWishlistStore } from '@/stores/wishlistStore'
import { getMediaType } from '@/utils/media'

export function WishlistGrid() {
  const { t } = useTranslation()
  const { wishlist } = useWishlistStore()
  const [filter, setFilter] = useState<'all' | MediaType>('all')

  if (wishlist.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-lg px-6 py-20 text-center shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
        <span className="bg-secondary text-muted-foreground flex size-16 items-center justify-center rounded-full">
          <Heart className="size-8 stroke-1" />
        </span>
        <div className="text-center">
          <p className="text-muted-foreground text-lg">
            {t('wishlist.empty.title')}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('wishlist.empty.description')}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/">{t('wishlist.empty.explore')}</a>
        </Button>
      </div>
    )
  }

  const filteredWishlist =
    filter === 'all'
      ? wishlist
      : wishlist.filter((item) => getMediaType(item) === filter)

  return (
    <div className="space-y-6">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as typeof filter)}
      >
        <TabsList className="bg-secondary rounded-full p-1">
          <TabsTrigger value="all" className="rounded-full">
            {t('wishlist.filters.all')}
          </TabsTrigger>
          <TabsTrigger value="movie" className="rounded-full">
            {t('mediaType.movies')}
          </TabsTrigger>
          <TabsTrigger value="tv" className="rounded-full">
            {t('mediaType.tvShows')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <MovieGrid
        movies={filteredWishlist}
        emptyMessage={t('wishlist.filters.empty')}
      />
    </div>
  )
}
