import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Movie } from '@/services/tmdb/types'
import {
  supabaseWishlistRemote,
  type WishlistRemote,
} from '@/services/supabase/wishlist'
import { useAuthStore } from './authStore'

interface WishlistState {
  wishlist: Movie[]
  isLoading: boolean
  error: string | null
}

interface WishlistActions {
  addToWishlist: (movie: Movie) => Promise<void>
  removeFromWishlist: (movieId: number) => Promise<void>
  clearWishlist: () => Promise<void>
  syncWithRemoteWishlist: () => Promise<void>
  isInWishlist: (movieId: number) => boolean
}

type WishlistStore = WishlistState & WishlistActions
let wishlistRemote: WishlistRemote = supabaseWishlistRemote

export function setWishlistRemoteForTesting(remote: WishlistRemote | null) {
  wishlistRemote = remote ?? supabaseWishlistRemote
}

function getAuthenticatedUserId() {
  return useAuthStore.getState().user?.uid ?? null
}

function mergeWishlistByMovieId(localMovies: Movie[], remoteMovies: Movie[]) {
  const merged = new Map<number, Movie>()

  localMovies.forEach((movie) => {
    merged.set(movie.id, movie)
  })
  remoteMovies.forEach((movie) => {
    merged.set(movie.id, movie)
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
        addToWishlist: async (movie) => {
          const userId = getAuthenticatedUserId()
          const { wishlist } = get()
          if (wishlist.some((m) => m.id === movie.id)) return

          if (!userId) {
            set(
              { wishlist: [...wishlist, movie], error: null },
              false,
              'addToWishlist/local',
            )
            return
          }

          try {
            await wishlistRemote.add(userId, movie)
            set(
              { wishlist: [...wishlist, movie], error: null },
              false,
              'addToWishlist/remote',
            )
          } catch (error) {
            set({ error: getErrorMessage(error) }, false, 'addToWishlist/error')
            throw error
          }
        },

        removeFromWishlist: async (movieId) => {
          const userId = getAuthenticatedUserId()

          if (!userId) {
            set(
              (state) => ({
                wishlist: state.wishlist.filter((m) => m.id !== movieId),
                error: null,
              }),
              false,
              'removeFromWishlist/local',
            )
            return
          }

          try {
            await wishlistRemote.remove(userId, movieId)
            set(
              (state) => ({
                wishlist: state.wishlist.filter((m) => m.id !== movieId),
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
            const mergedWishlist = mergeWishlistByMovieId(
              get().wishlist,
              remoteWishlist,
            )
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

        isInWishlist: (movieId) => {
          return get().wishlist.some((m) => m.id === movieId)
        },
      }),
      { name: 'wishlist-storage' },
    ),
    { name: 'wishlist-store' },
  ),
)
