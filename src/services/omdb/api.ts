import axios from 'axios'
import type { OmdbMovieResponse } from './types'

const OMDB_BASE_URL = 'https://www.omdbapi.com/'

export async function getOmdbMovie(imdbId: string | null | undefined) {
  const apiKey = import.meta.env.VITE_OMDB_API_KEY

  if (!apiKey || !imdbId) return null

  const { data } = await axios.get<OmdbMovieResponse>(OMDB_BASE_URL, {
    params: {
      apikey: apiKey,
      i: imdbId,
    },
  })

  return data.Response === 'True' ? data : null
}
