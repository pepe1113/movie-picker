import type { DiscoverMovieParams } from '@/services/tmdb/types'
import type { FilterState } from '@/types/filter'

interface QueryOptions {
  language?: string
  page?: number
}

export function buildFilterDiscoverQuery(
  filter: FilterState,
  options: QueryOptions = {},
): DiscoverMovieParams {
  const params: DiscoverMovieParams = {
    sort_by: filter.sortBy,
    'vote_count.gte': 100,
  }

  if (filter.genres.length > 0) {
    params.with_genres = filter.genres.join('|')
  }
  if (filter.year.from) {
    params['primary_release_date.gte'] = `${filter.year.from}-01-01`
  }
  if (filter.year.to) {
    params['primary_release_date.lte'] = `${filter.year.to}-12-31`
  }
  if (filter.rating.min > 0) {
    params['vote_average.gte'] = filter.rating.min
  }
  if (filter.rating.max < 10) {
    params['vote_average.lte'] = filter.rating.max
  }

  return {
    ...params,
    ...(options.language ? { language: options.language } : {}),
    ...(options.page ? { page: options.page } : {}),
  }
}
