import axios from 'axios'
import { TMDB_BASE_URL } from '@/utils/constants'
import { ENDPOINTS } from './endpoints'
import type {
  DiscoverMovieParams,
  DiscoverTvParams,
  GenreListResponse,
  MediaItem,
  MediaListResponse,
  MovieListResponse,
  PaginatedResponse,
  TvListResponse,
  TvShow,
} from './types'

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_TMDB_ACCESS_TOKEN}`,
  },
})

// --- 電影列表 ---

export async function getTrendingMovies(page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<MovieListResponse>(ENDPOINTS.TRENDING, {
    params: { page, language },
  })
  return data
}

export async function getPopularMovies(page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<MovieListResponse>(ENDPOINTS.POPULAR, {
    params: { page, language },
  })
  return data
}

export async function getTopRatedMovies(page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.TOP_RATED,
    { params: { page, language } },
  )
  return data
}

export async function getNowPlayingMovies(page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.NOW_PLAYING,
    { params: { page, language } },
  )
  return data
}

function addTvMediaType(
  response: PaginatedResponse<Omit<TvShow, 'media_type'>>,
): TvListResponse {
  return {
    ...response,
    results: response.results.map((show) => ({
      ...show,
      media_type: 'tv',
    })),
  }
}

// --- 影集列表 ---

async function getTvList(endpoint: string, page: number, language: string) {
  const { data } = await tmdbClient.get<
    PaginatedResponse<Omit<TvShow, 'media_type'>>
  >(endpoint, { params: { page, language } })
  return addTvMediaType(data)
}

export function getTrendingTv(page = 1, language = 'zh-TW') {
  return getTvList(ENDPOINTS.TRENDING_TV, page, language)
}

export function getPopularTv(page = 1, language = 'zh-TW') {
  return getTvList(ENDPOINTS.POPULAR_TV, page, language)
}

export function getTopRatedTv(page = 1, language = 'zh-TW') {
  return getTvList(ENDPOINTS.TOP_RATED_TV, page, language)
}

export function getOnTheAirTv(page = 1, language = 'zh-TW') {
  return getTvList(ENDPOINTS.ON_THE_AIR_TV, page, language)
}

// --- 搜尋與探索 ---

export async function searchMovies(query: string, page = 1) {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.SEARCH_MOVIE,
    { params: { query, page } },
  )
  return data
}

interface PersonSearchResult {
  id: number
  media_type: 'person'
}

export async function searchMedia(query: string, page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<
    PaginatedResponse<MediaItem | PersonSearchResult>
  >(ENDPOINTS.SEARCH_MULTI, { params: { query, page, language } })
  const results = data.results.filter(
    (result): result is MediaItem =>
      result.media_type === 'movie' || result.media_type === 'tv',
  )

  return {
    ...data,
    results,
    total_results: results.length,
  } satisfies MediaListResponse
}

export async function discoverMovies(params: DiscoverMovieParams) {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.DISCOVER_MOVIE,
    { params },
  )
  return data
}

export async function discoverTv(params: DiscoverTvParams) {
  const { data } = await tmdbClient.get<
    PaginatedResponse<Omit<TvShow, 'media_type'>>
  >(ENDPOINTS.DISCOVER_TV, { params })
  return addTvMediaType(data)
}

// --- 分類 ---

export async function getGenres(language = 'zh-TW') {
  const { data } = await tmdbClient.get<GenreListResponse>(
    ENDPOINTS.GENRE_LIST,
    { params: { language } },
  )
  return data.genres
}

export async function getTvGenres(language = 'zh-TW') {
  const { data } = await tmdbClient.get<GenreListResponse>(
    ENDPOINTS.TV_GENRE_LIST,
    { params: { language } },
  )
  return data.genres
}
