import type { Movie } from '@/services/tmdb/types'
import { getSupabaseClient } from './client'

interface WishlistRow {
  movie_snapshot: Movie
}

export interface WishlistRemote {
  list: (userId: string) => Promise<Movie[]>
  upsert: (userId: string, movies: Movie[]) => Promise<void>
  add: (userId: string, movie: Movie) => Promise<void>
  remove: (userId: string, movieId: number) => Promise<void>
  clear: (userId: string) => Promise<void>
}

function toWishlistPayload(userId: string, movie: Movie) {
  return {
    user_id: userId,
    movie_id: movie.id,
    movie_snapshot: movie,
    updated_at: new Date().toISOString(),
  }
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export const supabaseWishlistRemote: WishlistRemote = {
  async list(userId) {
    const { data, error } = await getSupabaseClient()
      .from('wishlist_items')
      .select('movie_snapshot')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    throwIfSupabaseError(error)

    return ((data ?? []) as WishlistRow[]).map((row) => row.movie_snapshot)
  },

  async upsert(userId, movies) {
    if (movies.length === 0) return

    const { error } = await getSupabaseClient()
      .from('wishlist_items')
      .upsert(movies.map((movie) => toWishlistPayload(userId, movie)), {
        onConflict: 'user_id,movie_id',
      })

    throwIfSupabaseError(error)
  },

  async add(userId, movie) {
    await this.upsert(userId, [movie])
  },

  async remove(userId, movieId) {
    const { error } = await getSupabaseClient()
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId)

    throwIfSupabaseError(error)
  },

  async clear(userId) {
    const { error } = await getSupabaseClient()
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)

    throwIfSupabaseError(error)
  },
}
