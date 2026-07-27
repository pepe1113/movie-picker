import { motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useWishlistStore } from '@/stores/wishlistStore'
import type { MediaItem } from '@/services/tmdb/types'
import { getMediaTitle, getMediaType } from '@/utils/media'

interface WishlistButtonProps {
  movie: MediaItem
  size?: 'default' | 'lg'
}

export function WishlistButton({
  movie,
  size = 'default',
}: WishlistButtonProps) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore()
  const mediaType = getMediaType(movie)
  const title = getMediaTitle(movie)
  const isWishlisted = isInWishlist(movie.id, mediaType)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      if (isWishlisted) {
        await removeFromWishlist(movie.id, mediaType)
        toast.success(t('wishlist.button.removedToast', { title }))
      } else {
        await addToWishlist(movie)
        toast.success(t('wishlist.button.addedToast', { title }))
      }
    } catch {
      toast.error(t('wishlist.button.syncFailed'))
    }
  }

  return (
    <motion.div whileTap={{ scale: 0.85 }}>
      <Button
        variant={isWishlisted ? 'default' : 'secondary'}
        size={size === 'lg' ? 'lg' : 'icon-sm'}
        onClick={handleClick}
        className={
          size === 'lg' ? 'gap-2' : 'shadow-[rgba(0,0,0,0.5)_0px_8px_24px]'
        }
      >
        <Heart className={`size-4 ${isWishlisted ? 'fill-current' : ''}`} />
        {size === 'lg' &&
          (isWishlisted
            ? t('wishlist.button.added')
            : t('wishlist.button.add'))}
      </Button>
    </motion.div>
  )
}
