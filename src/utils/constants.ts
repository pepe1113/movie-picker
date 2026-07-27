export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
} as const

export const QUERY_KEYS = {
  media: {
    all: ['media'] as const,
    list: (mediaType: string, listType: string) =>
      [...QUERY_KEYS.media.all, mediaType, listType] as const,
    detail: (mediaType: string, id: number, language?: string) =>
      [...QUERY_KEYS.media.all, mediaType, 'detail', id, language] as const,
    credits: (mediaType: string, id: number, language?: string) =>
      [...QUERY_KEYS.media.all, mediaType, 'credits', id, language] as const,
    videos: (mediaType: string, id: number, language?: string) =>
      [...QUERY_KEYS.media.all, mediaType, 'videos', id, language] as const,
    search: (query: string, language: string) =>
      [...QUERY_KEYS.media.all, 'search', query, language] as const,
    discover: (mediaType: string, params?: Record<string, unknown>) =>
      [...QUERY_KEYS.media.all, mediaType, 'discover', params ?? {}] as const,
    genres: (mediaType: string, language: string) =>
      [...QUERY_KEYS.media.all, mediaType, 'genres', language] as const,
  },
  movies: {
    all: ['movies'] as const,
    trending: () => [...QUERY_KEYS.movies.all, 'trending'] as const,
    popular: () => [...QUERY_KEYS.movies.all, 'popular'] as const,
    topRated: () => [...QUERY_KEYS.movies.all, 'top-rated'] as const,
    nowPlaying: () => [...QUERY_KEYS.movies.all, 'now-playing'] as const,
    detail: (id: number, language?: string) =>
      [...QUERY_KEYS.movies.all, 'detail', id, language] as const,
    credits: (id: number, language?: string) =>
      [...QUERY_KEYS.movies.all, 'credits', id, language] as const,
    videos: (id: number, language?: string) =>
      [...QUERY_KEYS.movies.all, 'videos', id, language] as const,
    omdb: (imdbId: string | null | undefined) =>
      [...QUERY_KEYS.movies.all, 'omdb', imdbId] as const,
    search: (query: string) =>
      [...QUERY_KEYS.movies.all, 'search', query] as const,
    discover: (params?: Record<string, unknown>) =>
      [...QUERY_KEYS.movies.all, 'discover', params ?? {}] as const,
  },
  genres: ['genres'] as const,
} as const

export const TMDB_LANGUAGE_MAP = {
  'zh-TW': 'zh-TW',
  en: 'en-US',
} as const

export const ROUTES = {
  HOME: '/',
  MOVIE_DETAIL: (id: number | string) => `/movie/${id}`,
  TV_DETAIL: (id: number | string) => `/tv/${id}`,
  SEARCH: '/search',
  WISHLIST: '/wishlist',
  HISTORY: '/history',
} as const
