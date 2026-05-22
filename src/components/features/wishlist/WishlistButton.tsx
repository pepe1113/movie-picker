import { motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useWishlistStore } from '@/stores/wishlistStore'
import type { Movie } from '@/services/tmdb/types'

interface WishlistButtonProps {
  movie: Movie
  size?: 'default' | 'lg'
}

export function WishlistButton({
  movie,
  size = 'default',
}: WishlistButtonProps) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore()
  const isWishlisted = isInWishlist(movie.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isWishlisted) {
      removeFromWishlist(movie.id)
      toast.success(t('wishlist.button.removedToast', { title: movie.title }))
    } else {
      addToWishlist(movie)
      toast.success(t('wishlist.button.addedToast', { title: movie.title }))
    }
  }

  return (
    <motion.div whileTap={{ scale: 0.85 }}>
      <Button
        variant={isWishlisted ? 'default' : 'secondary'}
        size={size === 'lg' ? 'default' : 'icon-sm'}
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
