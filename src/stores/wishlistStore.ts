import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { MediaItem, MediaType } from '@/services/tmdb/types'
import type { WishlistRemote } from '@/services/supabase/wishlist'
import { getMediaKey, getMediaType } from '@/utils/media'
import { useAuthStore } from './authStore'

interface WishlistState {
  wishlist: MediaItem[]
  wishlistUserId: string | null
  isLoading: boolean
  error: string | null
}

interface WishlistActions {
  addToWishlist: (media: MediaItem) => Promise<void>
  removeFromWishlist: (mediaId: number, mediaType?: MediaType) => Promise<void>
  clearWishlist: () => Promise<void>
  syncWithRemoteWishlist: (userId: string) => Promise<void>
  resetForSignedOut: () => void
  isInWishlist: (mediaId: number, mediaType?: MediaType) => boolean
}

type WishlistStore = WishlistState & WishlistActions
let wishlistRemote: WishlistRemote | null = null

async function getWishlistRemote() {
  return (
    wishlistRemote ??
    (await import('@/services/supabase/wishlist')).supabaseWishlistRemote
  )
}

export function setWishlistRemoteForTesting(remote: WishlistRemote | null) {
  wishlistRemote = remote
}

function getAuthenticatedUserId() {
  return useAuthStore.getState().user?.uid ?? null
}

function getWishlistForUser(state: WishlistState, userId: string | null) {
  return (state.wishlistUserId ?? null) === userId ? state.wishlist : []
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
        wishlistUserId: null,
        isLoading: false,
        error: null,

        // Actions
        addToWishlist: async (media) => {
          const userId = getAuthenticatedUserId()
          const wishlist = getWishlistForUser(get(), userId)
          const mediaKey = getMediaKey(media)
          if (wishlist.some((item) => getMediaKey(item) === mediaKey)) return

          if (!userId) {
            set(
              {
                wishlist: [...wishlist, media],
                wishlistUserId: null,
                error: null,
              },
              false,
              'addToWishlist/local',
            )
            return
          }

          try {
            await (await getWishlistRemote()).add(userId, media)
            if (getAuthenticatedUserId() !== userId) return
            set(
              (state) => {
                const currentWishlist = getWishlistForUser(state, userId)
                if (
                  currentWishlist.some((item) => getMediaKey(item) === mediaKey)
                ) {
                  return { wishlistUserId: userId, error: null }
                }

                return {
                  wishlist: [...currentWishlist, media],
                  wishlistUserId: userId,
                  error: null,
                }
              },
              false,
              'addToWishlist/remote',
            )
          } catch (error) {
            if (getAuthenticatedUserId() === userId) {
              set(
                { error: getErrorMessage(error) },
                false,
                'addToWishlist/error',
              )
            }
            throw error
          }
        },

        removeFromWishlist: async (mediaId, mediaType = 'movie') => {
          const userId = getAuthenticatedUserId()

          if (!userId) {
            set(
              (state) => ({
                wishlist: getWishlistForUser(state, null).filter(
                  (item) =>
                    item.id !== mediaId || getMediaType(item) !== mediaType,
                ),
                wishlistUserId: null,
                error: null,
              }),
              false,
              'removeFromWishlist/local',
            )
            return
          }

          try {
            await (await getWishlistRemote()).remove(userId, mediaId, mediaType)
            if (getAuthenticatedUserId() !== userId) return
            set(
              (state) => ({
                wishlist: getWishlistForUser(state, userId).filter(
                  (item) =>
                    item.id !== mediaId || getMediaType(item) !== mediaType,
                ),
                wishlistUserId: userId,
                error: null,
              }),
              false,
              'removeFromWishlist/remote',
            )
          } catch (error) {
            if (getAuthenticatedUserId() === userId) {
              set(
                { error: getErrorMessage(error) },
                false,
                'removeFromWishlist/error',
              )
            }
            throw error
          }
        },

        clearWishlist: async () => {
          const userId = getAuthenticatedUserId()

          if (!userId) {
            set(
              { wishlist: [], wishlistUserId: null, error: null },
              false,
              'clearWishlist/local',
            )
            return
          }

          try {
            await (await getWishlistRemote()).clear(userId)
            if (getAuthenticatedUserId() !== userId) return
            set(
              { wishlist: [], wishlistUserId: userId, error: null },
              false,
              'clearWishlist/remote',
            )
          } catch (error) {
            if (getAuthenticatedUserId() === userId) {
              set(
                { error: getErrorMessage(error) },
                false,
                'clearWishlist/error',
              )
            }
            throw error
          }
        },

        syncWithRemoteWishlist: async (userId) => {
          if (getAuthenticatedUserId() !== userId) return

          set(
            (state) => {
              const previousUserId = state.wishlistUserId ?? null
              const isSwitchingAccounts =
                previousUserId !== null && previousUserId !== userId

              return {
                wishlist: isSwitchingAccounts ? [] : state.wishlist,
                wishlistUserId: userId,
                isLoading: true,
                error: null,
              }
            },
            false,
            'syncWishlist/start',
          )

          try {
            const remote = await getWishlistRemote()
            const remoteWishlist = await remote.list(userId)
            if (getAuthenticatedUserId() !== userId) return

            const state = get()
            const localWishlist =
              (state.wishlistUserId ?? null) === null ||
              state.wishlistUserId === userId
                ? state.wishlist
                : []
            const mergedWishlist = mergeWishlist(localWishlist, remoteWishlist)
            await remote.upsert(userId, mergedWishlist)
            if (getAuthenticatedUserId() !== userId) return
            set(
              {
                wishlist: mergedWishlist,
                wishlistUserId: userId,
                isLoading: false,
                error: null,
              },
              false,
              'syncWishlist/success',
            )
          } catch (error) {
            if (getAuthenticatedUserId() === userId) {
              set(
                { isLoading: false, error: getErrorMessage(error) },
                false,
                'syncWishlist/error',
              )
            }
            throw error
          }
        },

        resetForSignedOut: () => {
          if (getAuthenticatedUserId()) return

          set(
            (state) => ({
              wishlist: getWishlistForUser(state, null),
              wishlistUserId: null,
              isLoading: false,
              error: null,
            }),
            false,
            'resetForSignedOut',
          )
        },

        isInWishlist: (mediaId, mediaType = 'movie') => {
          return getWishlistForUser(get(), getAuthenticatedUserId()).some(
            (item) => item.id === mediaId && getMediaType(item) === mediaType,
          )
        },
      }),
      { name: 'wishlist-storage' },
    ),
    { name: 'wishlist-store' },
  ),
)
