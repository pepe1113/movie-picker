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
  known_for?: MediaItem[]
}

function isMediaItem(result: { media_type?: string }): result is MediaItem {
  return result.media_type === 'movie' || result.media_type === 'tv'
}

/** 人物結果展開為其代表作，並以 media_type + id 去重 */
export function flattenMultiSearchResults(
  results: (MediaItem | PersonSearchResult)[],
): MediaItem[] {
  return dedupeMedia(
    results.flatMap((result) =>
      result.media_type === 'person'
        ? (result.known_for ?? []).filter(isMediaItem)
        : isMediaItem(result)
          ? [result]
          : [],
    ),
  )
}

function dedupeMedia(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.media_type}-${item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchMedia(query: string, page = 1, language = 'zh-TW') {
  const { data } = await tmdbClient.get<
    PaginatedResponse<MediaItem | PersonSearchResult>
  >(ENDPOINTS.SEARCH_MULTI, { params: { query, page, language } })
  const results = flattenMultiSearchResults(data.results)

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

interface PersonCombinedCreditsResponse {
  id: number
  cast: (MediaItem | { media_type?: string })[]
  crew: (MediaItem | { media_type?: string })[]
}

/** 人物完整作品（演出＋幕後），去重後依熱門度排序 */
export async function getPersonCredits(
  personId: number,
  language = 'zh-TW',
): Promise<MediaListResponse> {
  const { data } = await tmdbClient.get<PersonCombinedCreditsResponse>(
    ENDPOINTS.PERSON_COMBINED_CREDITS(personId),
    { params: { language } },
  )
  const results = dedupeMedia(
    [...data.cast, ...data.crew].filter(isMediaItem),
  ).sort((a, b) => b.popularity - a.popularity)

  return { page: 1, results, total_pages: 1, total_results: results.length }
}

/** 依製作公司取得電影與影集（同頁數合併） */
export async function discoverByCompany(
  companyId: number,
  page = 1,
  language = 'zh-TW',
): Promise<MediaListResponse> {
  const params = {
    page,
    language,
    sort_by: 'popularity.desc',
    with_companies: companyId.toString(),
  }
  const [movies, tv] = await Promise.all([
    discoverMovies(params),
    discoverTv(params),
  ])
  return {
    page,
    results: [...movies.results, ...tv.results].sort(
      (a, b) => b.popularity - a.popularity,
    ),
    total_pages: Math.max(movies.total_pages, tv.total_pages),
    total_results: movies.total_results + tv.total_results,
  }
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
