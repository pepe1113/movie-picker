import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Movie, TvShow } from '@/services/tmdb/types'
import { useAuthStore } from '@/stores/authStore'
import {
  setWishlistRemoteForTesting,
  useWishlistStore,
} from '@/stores/wishlistStore'

function movie(id: number, title = `Movie ${id}`): Movie {
  return {
    adult: false,
    backdrop_path: null,
    genre_ids: [28],
    id,
    original_language: 'en',
    original_title: title,
    overview: '',
    popularity: 10,
    poster_path: null,
    release_date: '2026-01-01',
    title,
    video: false,
    vote_average: 8,
    vote_count: 100,
  }
}

function tvShow(id: number, name = `TV ${id}`): TvShow {
  return {
    adult: false,
    backdrop_path: null,
    first_air_date: '2026-01-01',
    genre_ids: [18],
    id,
    media_type: 'tv',
    name,
    origin_country: ['TW'],
    original_language: 'zh',
    original_name: name,
    overview: '',
    popularity: 10,
    poster_path: null,
    vote_average: 8,
    vote_count: 100,
  }
}

describe('wishlist store sync', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    useWishlistStore.setState({
      wishlist: [],
      isLoading: false,
      error: null,
    })
    setWishlistRemoteForTesting(null)
  })

  it('keeps unauthenticated wishlist changes local', async () => {
    const remoteAdd = vi.fn()
    setWishlistRemoteForTesting({
      list: vi.fn(),
      upsert: vi.fn(),
      add: remoteAdd,
      remove: vi.fn(),
      clear: vi.fn(),
    })

    await useWishlistStore.getState().addToWishlist(movie(1))
    await useWishlistStore.getState().removeFromWishlist(1)

    expect(remoteAdd).not.toHaveBeenCalled()
    expect(useWishlistStore.getState().wishlist).toEqual([])
  })

  it('keeps a movie and TV show that share the same TMDB id', async () => {
    await useWishlistStore.getState().addToWishlist(movie(1))
    await useWishlistStore.getState().addToWishlist(tvShow(1))

    expect(useWishlistStore.getState().wishlist).toHaveLength(2)
    expect(useWishlistStore.getState().isInWishlist(1, 'movie')).toBe(true)
    expect(useWishlistStore.getState().isInWishlist(1, 'tv')).toBe(true)

    await useWishlistStore.getState().removeFromWishlist(1, 'tv')

    expect(useWishlistStore.getState().wishlist).toEqual([movie(1)])
  })

  it('merges local and remote wishlist by movie id after login', async () => {
    const remoteMovie = movie(2)
    const localMovie = movie(1)
    const duplicatedLocalMovie = movie(2, 'Local duplicate')
    const upsert = vi.fn().mockResolvedValue(undefined)

    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    useWishlistStore.setState({
      wishlist: [localMovie, duplicatedLocalMovie],
      isLoading: false,
      error: null,
    })
    setWishlistRemoteForTesting({
      list: vi.fn().mockResolvedValue([remoteMovie]),
      upsert,
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    })

    await useWishlistStore.getState().syncWithRemoteWishlist()

    expect(useWishlistStore.getState().wishlist.map((item) => item.id)).toEqual(
      [1, 2],
    )
    expect(upsert).toHaveBeenCalledWith('user-id', [localMovie, remoteMovie])
  })

  it('writes logged-in additions to Supabase before updating state', async () => {
    const nextMovie = movie(3)
    const add = vi.fn().mockResolvedValue(undefined)
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setWishlistRemoteForTesting({
      list: vi.fn(),
      upsert: vi.fn(),
      add,
      remove: vi.fn(),
      clear: vi.fn(),
    })

    await useWishlistStore.getState().addToWishlist(nextMovie)

    expect(add).toHaveBeenCalledWith('user-id', nextMovie)
    expect(useWishlistStore.getState().wishlist).toEqual([nextMovie])
  })

  it('does not update UI when a logged-in write fails', async () => {
    useAuthStore.getState().setUser({
      uid: 'user-id',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: null,
    })
    setWishlistRemoteForTesting({
      list: vi.fn(),
      upsert: vi.fn(),
      add: vi.fn().mockRejectedValue(new Error('network failed')),
      remove: vi.fn(),
      clear: vi.fn(),
    })

    await expect(
      useWishlistStore.getState().addToWishlist(movie(4)),
    ).rejects.toThrow('network failed')

    expect(useWishlistStore.getState().wishlist).toEqual([])
    expect(useWishlistStore.getState().error).toBe('network failed')
  })
})
