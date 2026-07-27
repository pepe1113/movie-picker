import type { MediaItem, MediaType } from '@/services/tmdb/types'
import { getMediaType } from '@/utils/media'
import { getSupabaseClient } from './client'

interface WishlistRow {
  movie_snapshot: MediaItem
}

export interface WishlistRemote {
  list: (userId: string) => Promise<MediaItem[]>
  upsert: (userId: string, media: MediaItem[]) => Promise<void>
  add: (userId: string, media: MediaItem) => Promise<void>
  remove: (
    userId: string,
    mediaId: number,
    mediaType: MediaType,
  ) => Promise<void>
  clear: (userId: string) => Promise<void>
}

function toWishlistPayload(userId: string, media: MediaItem) {
  return {
    user_id: userId,
    movie_id: media.id,
    media_type: getMediaType(media),
    movie_snapshot: media,
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

  async upsert(userId, media) {
    if (media.length === 0) return

    const { error } = await getSupabaseClient()
      .from('wishlist_items')
      .upsert(
        media.map((item) => toWishlistPayload(userId, item)),
        {
          onConflict: 'user_id,media_type,movie_id',
        },
      )

    throwIfSupabaseError(error)
  },

  async add(userId, media) {
    await this.upsert(userId, [media])
  },

  async remove(userId, mediaId, mediaType) {
    const { error } = await getSupabaseClient()
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', mediaId)
      .eq('media_type', mediaType)

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
