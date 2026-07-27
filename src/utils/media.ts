import type { MediaItem, MediaType, TvShow } from '@/services/tmdb/types'

export function getMediaType(media: MediaItem): MediaType {
  return media.media_type === 'tv' ? 'tv' : 'movie'
}

export function isTvShow(media: MediaItem): media is TvShow {
  return getMediaType(media) === 'tv'
}

export function getMediaTitle(media: MediaItem): string {
  return isTvShow(media) ? media.name : media.title
}

export function getMediaOriginalTitle(media: MediaItem): string {
  return isTvShow(media) ? media.original_name : media.original_title
}

export function getMediaDate(media: MediaItem): string {
  return isTvShow(media) ? media.first_air_date : media.release_date
}

export function getMediaKey(media: MediaItem): string {
  return `${getMediaType(media)}:${media.id}`
}

export function getMediaDetailPath(media: MediaItem): string {
  return `/${getMediaType(media)}/${media.id}`
}
