export interface OmdbRating {
  Source: string
  Value: string
}

export interface OmdbMovieResponse {
  Response: 'True' | 'False'
  Error?: string
  imdbRating?: string
  Ratings?: OmdbRating[]
}
