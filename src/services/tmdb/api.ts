import axios from 'axios'
import { TMDB_BASE_URL } from '@/utils/constants'
import { ENDPOINTS } from './endpoints'
import type {
  CreditsResponse,
  DiscoverMovieParams,
  GenreListResponse,
  MovieImagesResponse,
  MovieDetail,
  MovieListResponse,
  VideosResponse,
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

// --- 電影詳情 ---

export async function getMovieDetail(id: number, language = 'zh-TW') {
  const { data } = await tmdbClient.get<MovieDetail>(ENDPOINTS.MOVIE_DETAIL(id), {
    params: { language },
  })
  return data
}

export async function getMovieCredits(id: number, language = 'zh-TW') {
  const { data } = await tmdbClient.get<CreditsResponse>(
    ENDPOINTS.MOVIE_CREDITS(id),
    { params: { language } },
  )
  return data
}

export async function getMovieVideos(id: number, language = 'zh-TW') {
  const { data } = await tmdbClient.get<VideosResponse>(
    ENDPOINTS.MOVIE_VIDEOS(id),
    { params: { language } },
  )
  return data
}

export async function getMovieImages(id: number) {
  const { data } = await tmdbClient.get<MovieImagesResponse>(
    ENDPOINTS.MOVIE_IMAGES(id),
    {
      params: {
        include_image_language: 'ko,ja,en,zh',
      },
    },
  )
  return data
}

// --- 搜尋與探索 ---

export async function searchMovies(query: string, page = 1) {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.SEARCH_MOVIE,
    { params: { query, page } },
  )
  return data
}

export async function discoverMovies(params: DiscoverMovieParams) {
  const { data } = await tmdbClient.get<MovieListResponse>(
    ENDPOINTS.DISCOVER_MOVIE,
    { params },
  )
  return data
}

// --- 分類 ---

export async function getGenres() {
  const { data } = await tmdbClient.get<GenreListResponse>(ENDPOINTS.GENRE_LIST)
  return data.genres
}
