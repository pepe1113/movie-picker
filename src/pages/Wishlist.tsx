import { Star, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { WishlistGrid } from '@/components/features/wishlist/WishlistGrid'
import { useAuthStore } from '@/stores/authStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { formatRating } from '@/utils/helpers'

export function Component() {
  const { t } = useTranslation()
  const { isAuthenticated, signIn } = useAuthStore()
  const { wishlist, clearWishlist } = useWishlistStore()

  const avgRating =
    wishlist.length > 0
      ? wishlist.reduce((sum, m) => sum + m.vote_average, 0) / wishlist.length
      : 0

  const handleClear = async () => {
    try {
      await clearWishlist()
      toast.success(t('wishlist.cleared'))
    } catch {
      toast.error(t('wishlist.syncFailed'))
    }
  }

  return (
    <div className="container mx-auto space-y-8 px-6 py-10 md:px-12 lg:px-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">
            {t('wishlist.title')}
          </h1>
          {wishlist.length > 0 && (
            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {t('wishlist.stats.movieCount', { count: wishlist.length })}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-4" />
                {t('wishlist.stats.avgRating')} {formatRating(avgRating)}
              </span>
            </div>
          )}
        </div>

        {wishlist.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="size-4" />
                {t('wishlist.clearButton')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('wishlist.clearDialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('wishlist.clearDialog.description', {
                    count: wishlist.length,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">
                    {t('wishlist.clearDialog.cancel')}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={handleClear}>
                    {t('wishlist.clearDialog.confirm')}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isAuthenticated && (
        <div className="border-border bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t('wishlist.authPrompt.title')}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('wishlist.authPrompt.description')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signIn()}>
            {t('wishlist.authPrompt.action')}
          </Button>
        </div>
      )}

      <WishlistGrid />
    </div>
  )
}
