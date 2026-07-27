import type {
  DiscoverMovieParams,
  DiscoverTvParams,
  MediaItem,
  Movie,
} from '@/services/tmdb/types'
import {
  buildAiDiscoverQuery,
  getAiPickerKeywordKeys,
  getSelectedGenreIds,
  type AiPickerAnswers,
} from '@/utils/pickerCriteria'

export {
  AI_PICKER_QUESTIONS,
  getAiPickerKeywordPreferenceMeta,
  getAiPickerKeywordKeys,
  getAiPickerOption,
  getAiPickerPreferenceMeta,
  type AiPickerAnswers,
  type AiPickerOption,
  type AiPickerPreferenceMeta,
  type AiPickerQuestion,
  type AiPickerQuestionId,
} from '@/utils/pickerCriteria'

export interface AiMovieRecommendation {
  movie: MediaItem
  matchedKeywordKeys: string[]
}

export function buildAiMovieQuery(
  answers: AiPickerAnswers,
  currentYear = new Date().getFullYear(),
): DiscoverMovieParams {
  return buildAiDiscoverQuery(answers, { currentYear })
}

const TV_GENRE_MAP: Record<number, number> = {
  12: 10759,
  14: 10765,
  28: 10759,
  878: 10765,
}

export function buildAiTvQuery(
  answers: AiPickerAnswers,
  currentYear = new Date().getFullYear(),
): DiscoverTvParams {
  const movieQuery = buildAiMovieQuery(answers, currentYear)
  const mappedGenres = movieQuery.with_genres
    ?.split('|')
    .map(Number)
    .map((genreId) => TV_GENRE_MAP[genreId] ?? genreId)

  return {
    language: movieQuery.language,
    page: movieQuery.page,
    sort_by: movieQuery.sort_by,
    with_genres: mappedGenres
      ? [...new Set(mappedGenres)].join('|')
      : undefined,
    'first_air_date.gte': movieQuery['primary_release_date.gte'],
    'first_air_date.lte': movieQuery['primary_release_date.lte'],
    'vote_average.gte': movieQuery['vote_average.gte'],
    'vote_average.lte': movieQuery['vote_average.lte'],
    'vote_count.gte': movieQuery['vote_count.gte'],
  }
}

export function recommendMovies(
  movies: Movie[],
  answers: AiPickerAnswers,
  currentYear = new Date().getFullYear(),
): AiMovieRecommendation[] {
  const selectedGenreIds = getSelectedGenreIds(answers)
  const keywordKeys = getAiPickerKeywordKeys(answers)

  return [...movies]
    .map((movie) => ({
      movie,
      score: scoreMovie(movie, answers, selectedGenreIds, currentYear),
      matchedKeywordKeys: keywordKeys,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ movie, matchedKeywordKeys }) => ({ movie, matchedKeywordKeys }))
}

function scoreMovie(
  movie: Movie,
  answers: AiPickerAnswers,
  selectedGenreIds: number[],
  currentYear: number,
) {
  const genreMatches = movie.genre_ids.filter((genreId) =>
    selectedGenreIds.includes(genreId),
  ).length
  const releaseYear = Number(movie.release_date.slice(0, 4))
  const recentBonus =
    answers.era === 'recent' && releaseYear >= currentYear - 5 ? 8 : 0
  const classicBonus =
    answers.era === 'classic' && releaseYear <= currentYear - 10 ? 8 : 0
  const paceBonus =
    answers.pace === 'fast' ? movie.popularity / 2 : movie.vote_average * 1.3

  return (
    genreMatches * 20 +
    movie.vote_average * 3 +
    paceBonus +
    recentBonus +
    classicBonus
  )
}
