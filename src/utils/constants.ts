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

export const MOVIE_GENRES = [
  {
    id: 28,
    name: {
      en: 'Action',
      'zh-TW': '動作',
    },
  },
  {
    id: 12,
    name: {
      en: 'Adventure',
      'zh-TW': '冒險',
    },
  },
  {
    id: 16,
    name: {
      en: 'Animation',
      'zh-TW': '動畫',
    },
  },
  {
    id: 35,
    name: {
      en: 'Comedy',
      'zh-TW': '喜劇',
    },
  },
  {
    id: 80,
    name: {
      en: 'Crime',
      'zh-TW': '犯罪',
    },
  },
  {
    id: 99,
    name: {
      en: 'Documentary',
      'zh-TW': '紀錄',
    },
  },
  {
    id: 18,
    name: {
      en: 'Drama',
      'zh-TW': '劇情',
    },
  },
  {
    id: 10751,
    name: {
      en: 'Family',
      'zh-TW': '家庭',
    },
  },
  {
    id: 14,
    name: {
      en: 'Fantasy',
      'zh-TW': '奇幻',
    },
  },
  {
    id: 36,
    name: {
      en: 'History',
      'zh-TW': '歷史',
    },
  },
  {
    id: 27,
    name: {
      en: 'Horror',
      'zh-TW': '恐怖',
    },
  },
  {
    id: 10402,
    name: {
      en: 'Music',
      'zh-TW': '音樂',
    },
  },
  {
    id: 9648,
    name: {
      en: 'Mystery',
      'zh-TW': '懸疑',
    },
  },
  {
    id: 10749,
    name: {
      en: 'Romance',
      'zh-TW': '愛情',
    },
  },
  {
    id: 878,
    name: {
      en: 'Science Fiction',
      'zh-TW': '科幻',
    },
  },
  {
    id: 10770,
    name: {
      en: 'TV Movie',
      'zh-TW': '電視電影',
    },
  },
  {
    id: 53,
    name: {
      en: 'Thriller',
      'zh-TW': '驚悚',
    },
  },
  {
    id: 10752,
    name: {
      en: 'War',
      'zh-TW': '戰爭',
    },
  },
  {
    id: 37,
    name: {
      en: 'Western',
      'zh-TW': '西部',
    },
  },
] as const

export const TV_GENRES = [
  {
    id: 10759,
    name: {
      en: 'Action & Adventure',
      'zh-TW': '動作冒險',
    },
  },
  {
    id: 16,
    name: {
      en: 'Animation',
      'zh-TW': '動畫',
    },
  },
  {
    id: 35,
    name: {
      en: 'Comedy',
      'zh-TW': '喜劇',
    },
  },
  {
    id: 80,
    name: {
      en: 'Crime',
      'zh-TW': '犯罪',
    },
  },
  {
    id: 99,
    name: {
      en: 'Documentary',
      'zh-TW': '紀錄',
    },
  },
  {
    id: 18,
    name: {
      en: 'Drama',
      'zh-TW': '劇情',
    },
  },
  {
    id: 10751,
    name: {
      en: 'Family',
      'zh-TW': '家庭',
    },
  },
  {
    id: 10762,
    name: {
      en: 'Kids',
      'zh-TW': '兒童',
    },
  },
  {
    id: 9648,
    name: {
      en: 'Mystery',
      'zh-TW': '懸疑',
    },
  },
  {
    id: 10763,
    name: {
      en: 'News',
      'zh-TW': '新聞',
    },
  },
  {
    id: 10764,
    name: {
      en: 'Reality',
      'zh-TW': '真人秀',
    },
  },
  {
    id: 10765,
    name: {
      en: 'Sci-Fi & Fantasy',
      'zh-TW': '科幻與奇幻',
    },
  },
  {
    id: 10766,
    name: {
      en: 'Soap',
      'zh-TW': '肥皂劇',
    },
  },
  {
    id: 10767,
    name: {
      en: 'Talk',
      'zh-TW': '脫口秀',
    },
  },
  {
    id: 10768,
    name: {
      en: 'War & Politics',
      'zh-TW': '戰爭與政治',
    },
  },
  {
    id: 37,
    name: {
      en: 'Western',
      'zh-TW': '西部',
    },
  },
] as const
