import type { InfiniteData } from '@tanstack/react-query'
import type { MediaListResponse } from '@/services/tmdb/types'

export interface FetchNextMoviePageInput {
  visibleCount: number
  increment: number
  loadedCount: number
  hasNextPage?: boolean
}

export function getNextVisibleCount(visibleCount: number, increment: number) {
  return visibleCount + increment
}

export function shouldFetchNextMoviePage({
  visibleCount,
  increment,
  loadedCount,
  hasNextPage,
}: FetchNextMoviePageInput) {
  return Boolean(hasNextPage) && visibleCount + increment >= loadedCount
}

export function selectInfiniteMedia(data: InfiniteData<MediaListResponse>) {
  return { media: data.pages.flatMap((page) => page.results) }
}
