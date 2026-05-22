import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MovieGrid } from '@/components/features/movie/MovieGrid'
import { useWishlistStore } from '@/stores/wishlistStore'

export function WishlistGrid() {
  const { t } = useTranslation()
  const { wishlist } = useWishlistStore()

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

  return <MovieGrid movies={wishlist} />
}
