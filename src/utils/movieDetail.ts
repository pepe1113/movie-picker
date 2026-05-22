import type { MovieImage, MovieImagesResponse } from '@/services/tmdb/types'
import type { OmdbMovieResponse } from '@/services/omdb/types'

const REGIONAL_POSTERS = [
  { region: 'KR', labelKey: 'movieDetail.regionalPosters.korea', language: 'ko' },
  { region: 'JP', labelKey: 'movieDetail.regionalPosters.japan', language: 'ja' },
  { region: 'US', labelKey: 'movieDetail.regionalPosters.us', language: 'en' },
  { region: 'TW', labelKey: 'movieDetail.regionalPosters.taiwan', language: 'zh' },
] as const

export interface RegionalPoster extends MovieImage {
  region: (typeof REGIONAL_POSTERS)[number]['region']
  labelKey: (typeof REGIONAL_POSTERS)[number]['labelKey']
}

export interface ExternalRating {
  label: string
  value: string
}

export function getRegionalPosters(
  images: MovieImagesResponse | null | undefined,
): RegionalPoster[] {
  if (!images) return []

  return REGIONAL_POSTERS.flatMap(({ region, labelKey, language }) => {
    const poster = images.posters
      .filter((image) => image.iso_639_1 === language)
      .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
      .at(0)

    return poster ? [{ ...poster, region, labelKey }] : []
  })
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
