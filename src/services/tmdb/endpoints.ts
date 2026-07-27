export const ENDPOINTS = {
  // 電影列表
  TRENDING: '/trending/movie/week',
  POPULAR: '/movie/popular',
  TOP_RATED: '/movie/top_rated',
  NOW_PLAYING: '/movie/now_playing',

  // 影集列表
  TRENDING_TV: '/trending/tv/week',
  POPULAR_TV: '/tv/popular',
  TOP_RATED_TV: '/tv/top_rated',
  ON_THE_AIR_TV: '/tv/on_the_air',

  // 電影詳情
  MOVIE_DETAIL: (id: number) => `/movie/${id}`,
  MOVIE_CREDITS: (id: number) => `/movie/${id}/credits`,
  MOVIE_VIDEOS: (id: number) => `/movie/${id}/videos`,

  // 影集詳情
  TV_DETAIL: (id: number) => `/tv/${id}`,
  TV_AGGREGATE_CREDITS: (id: number) => `/tv/${id}/aggregate_credits`,
  TV_VIDEOS: (id: number) => `/tv/${id}/videos`,

  // 搜尋與探索
  SEARCH_MOVIE: '/search/movie',
  SEARCH_MULTI: '/search/multi',
  DISCOVER_MOVIE: '/discover/movie',
  DISCOVER_TV: '/discover/tv',

  // 分類
  GENRE_LIST: '/genre/movie/list',
  TV_GENRE_LIST: '/genre/tv/list',
} as const
