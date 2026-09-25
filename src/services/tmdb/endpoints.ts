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

  // 搜尋與探索
  SEARCH_MOVIE: '/search/movie',
  SEARCH_MULTI: '/search/multi',
  DISCOVER_MOVIE: '/discover/movie',
  DISCOVER_TV: '/discover/tv',

  // 分類
  GENRE_LIST: '/genre/movie/list',
  TV_GENRE_LIST: '/genre/tv/list',
} as const
