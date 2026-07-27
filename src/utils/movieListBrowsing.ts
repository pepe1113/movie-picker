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
