export const ENDPOINTS = {
  // 電影列表
  TRENDING: '/trending/movie/week',
  POPULAR: '/movie/popular',
  TOP_RATED: '/movie/top_rated',
  NOW_PLAYING: '/movie/now_playing',

  // 電影詳情
  MOVIE_DETAIL: (id: number) => `/movie/${id}`,
  MOVIE_CREDITS: (id: number) => `/movie/${id}/credits`,
  MOVIE_VIDEOS: (id: number) => `/movie/${id}/videos`,

  // 搜尋與探索
  SEARCH_MOVIE: '/search/movie',
  DISCOVER_MOVIE: '/discover/movie',

  // 分類
  GENRE_LIST: '/genre/movie/list',
} as const
