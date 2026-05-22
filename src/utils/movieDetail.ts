import type { OmdbMovieResponse } from '@/services/omdb/types'
export interface ExternalRating {
  label: string
  value: string
}

export function getExternalRatings(
  omdb: OmdbMovieResponse | null | undefined,
): ExternalRating[] {
  if (!omdb?.Ratings) return []

  return [
    {
      source: 'Internet Movie Database',
      label: 'IMDb',
    },
    {
      source: 'Rotten Tomatoes',
      label: 'Rotten Tomatoes',
    },
  ].flatMap(({ source, label }) => {
    const rating = omdb.Ratings?.find((item) => item.Source === source)
    return rating ? [{ label, value: rating.Value }] : []
  })
}
