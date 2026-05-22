// --- Genre ---
export interface Genre {
  id: number
  name: string
}

export interface GenreListResponse {
  genres: Genre[]
}

// --- Movie (列表項目) ---
export interface Movie {
  adult: boolean
  backdrop_path: string | null
  genre_ids: number[]
  id: number
  original_language: string
  original_title: string
  overview: string
  popularity: number
  poster_path: string | null
  release_date: string
  title: string
  video: boolean
  vote_average: number
  vote_count: number
}

// --- 分頁回應 ---
export interface PaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export type MovieListResponse = PaginatedResponse<Movie>

// --- Movie Detail ---
export interface BelongsToCollection {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
}

export interface ProductionCompany {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

export interface ProductionCountry {
  iso_3166_1: string
  name: string
}

export interface SpokenLanguage {
  english_name: string
  iso_639_1: string
  name: string
}

export interface MovieDetail {
  adult: boolean
  backdrop_path: string | null
  belongs_to_collection: BelongsToCollection | null
  budget: number
  genres: Genre[]
  homepage: string
  id: number
  imdb_id: string
  original_language: string
  original_title: string
  overview: string
  popularity: number
  poster_path: string | null
  production_companies: ProductionCompany[]
  production_countries: ProductionCountry[]
  release_date: string
  revenue: number
  runtime: number
  spoken_languages: SpokenLanguage[]
  status: string
  tagline: string
  title: string
  video: boolean
  vote_average: number
  vote_count: number
}

// --- Images ---
export interface MovieImage {
  aspect_ratio: number
  height: number
  iso_639_1: string | null
  file_path: string
  vote_average: number
  vote_count: number
  width: number
}

export interface MovieImagesResponse {
  id: number
  posters: MovieImage[]
  backdrops: MovieImage[]
}

// --- Credits ---
export interface CastMember {
  adult: boolean
  gender: number | null
  id: number
  known_for_department: string | null
  name: string
  original_name: string
  popularity: number
  profile_path: string | null
  cast_id: number
  character: string
  credit_id: string
  order: number
}

export interface CrewMember {
  adult: boolean
  gender: number | null
  id: number
  known_for_department: string | null
  name: string
  original_name: string
  popularity: number
  profile_path: string | null
  credit_id: string
  department: string
  job: string
}

export interface CreditsResponse {
  id: number
  cast: CastMember[]
  crew: CrewMember[]
}

// --- Videos ---
export interface Video {
  id: string
  iso_639_1: string
  iso_3166_1: string
  key: string
  name: string
  official: boolean
  published_at: string
  site: string
  size: number
  type: string
}

export interface VideosResponse {
  id: number
  results: Video[]
}

// --- Discover 篩選參數 ---
export interface DiscoverMovieParams {
  page?: number
  language?: string
  sort_by?: string
  with_genres?: string
  'primary_release_date.gte'?: string
  'primary_release_date.lte'?: string
  'vote_average.gte'?: number
  'vote_average.lte'?: number
  'vote_count.gte'?: number
}
