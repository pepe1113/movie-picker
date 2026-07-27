import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { MediaItem, MediaType } from '@/services/tmdb/types'
import {
  supabaseWishlistRemote,
  type WishlistRemote,
} from '@/services/supabase/wishlist'
import { getMediaKey, getMediaType } from '@/utils/media'
import { useAuthStore } from './authStore'

interface WishlistState {
  wishlist: MediaItem[]
  isLoading: boolean
  error: string | null
}

interface WishlistActions {
  addToWishlist: (media: MediaItem) => Promise<void>
  removeFromWishlist: (mediaId: number, mediaType?: MediaType) => Promise<void>
  clearWishlist: () => Promise<void>
  syncWithRemoteWishlist: () => Promise<void>
  isInWishlist: (mediaId: number, mediaType?: MediaType) => boolean
}

type WishlistStore = WishlistState & WishlistActions
let wishlistRemote: WishlistRemote = supabaseWishlistRemote

export function setWishlistRemoteForTesting(remote: WishlistRemote | null) {
  wishlistRemote = remote ?? supabaseWishlistRemote
}

function getAuthenticatedUserId() {
  return useAuthStore.getState().user?.uid ?? null
}

function mergeWishlist(localItems: MediaItem[], remoteItems: MediaItem[]) {
  const merged = new Map<string, MediaItem>()

  localItems.forEach((media) => {
    merged.set(getMediaKey(media), media)
  })
  remoteItems.forEach((media) => {
    merged.set(getMediaKey(media), media)
  })

  return Array.from(merged.values())
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Wishlist sync failed'
}

export const useWishlistStore = create<WishlistStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        wishlist: [],
        isLoading: false,
        error: null,

        // Actions
        addToWishlist: async (media) => {
          const userId = getAuthenticatedUserId()
          const { wishlist } = get()
          const mediaKey = getMediaKey(media)
          if (wishlist.some((item) => getMediaKey(item) === mediaKey)) return

          if (!userId) {
            set(
              { wishlist: [...wishlist, media], error: null },
              false,
              'addToWishlist/local',
            )
            return
          }

          try {
            await wishlistRemote.add(userId, media)
            set(
              { wishlist: [...wishlist, media], error: null },
              false,
              'addToWishlist/remote',
            )
          } catch (error) {
            set({ error: getErrorMessage(error) }, false, 'addToWishlist/error')
            throw error
          }
        },

        removeFromWishlist: async (mediaId, mediaType = 'movie') => {
          const userId = getAuthenticatedUserId()

          if (!userId) {
            set(
              (state) => ({
                wishlist: state.wishlist.filter(
                  (item) =>
                    item.id !== mediaId || getMediaType(item) !== mediaType,
                ),
                error: null,
              }),
              false,
              'removeFromWishlist/local',
            )
            return
          }

          try {
            await wishlistRemote.remove(userId, mediaId, mediaType)
            set(
              (state) => ({
                wishlist: state.wishlist.filter(
                  (item) =>
                    item.id !== mediaId || getMediaType(item) !== mediaType,
                ),
                error: null,
              }),
              false,
              'removeFromWishlist/remote',
            )
          } catch (error) {
            set(
              { error: getErrorMessage(error) },
              false,
              'removeFromWishlist/error',
            )
            throw error
          }
        },

        clearWishlist: async () => {
          const userId = getAuthenticatedUserId()

          if (!userId) {
            set({ wishlist: [], error: null }, false, 'clearWishlist/local')
            return
          }

          try {
            await wishlistRemote.clear(userId)
            set({ wishlist: [], error: null }, false, 'clearWishlist/remote')
          } catch (error) {
            set({ error: getErrorMessage(error) }, false, 'clearWishlist/error')
            throw error
          }
        },

        syncWithRemoteWishlist: async () => {
          const userId = getAuthenticatedUserId()
          if (!userId) return

          set({ isLoading: true, error: null }, false, 'syncWishlist/start')

          try {
            const remoteWishlist = await wishlistRemote.list(userId)
            const mergedWishlist = mergeWishlist(get().wishlist, remoteWishlist)
            await wishlistRemote.upsert(userId, mergedWishlist)
            set(
              { wishlist: mergedWishlist, isLoading: false, error: null },
              false,
              'syncWishlist/success',
            )
          } catch (error) {
            set(
              { isLoading: false, error: getErrorMessage(error) },
              false,
              'syncWishlist/error',
            )
            throw error
          }
        },

        isInWishlist: (mediaId, mediaType = 'movie') => {
          return get().wishlist.some(
            (item) => item.id === mediaId && getMediaType(item) === mediaType,
          )
        },
      }),
      { name: 'wishlist-storage' },
    ),
    { name: 'wishlist-store' },
  ),
)
