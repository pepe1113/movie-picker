import type { DiscoverMovieParams, Movie } from '@/services/tmdb/types'
import {
  buildAiDiscoverQuery,
  getAiPickerKeywordKeys,
  getSelectedGenreIds,
  type AiPickerAnswers,
} from '@/utils/pickerCriteria'

export {
  AI_PICKER_QUESTIONS,
  getAiPickerKeywordKeys,
  getAiPickerOption,
  type AiPickerAnswers,
  type AiPickerOption,
  type AiPickerQuestion,
  type AiPickerQuestionId,
} from '@/utils/pickerCriteria'

export interface AiMovieRecommendation {
  movie: Movie
  matchedKeywordKeys: string[]
}

export function buildAiMovieQuery(
  answers: AiPickerAnswers,
  currentYear = new Date().getFullYear(),
): DiscoverMovieParams {
  return buildAiDiscoverQuery(answers, { currentYear })
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

  return genreMatches * 20 + movie.vote_average * 3 + paceBonus + recentBonus + classicBonus
}
