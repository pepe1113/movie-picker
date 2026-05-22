import { describe, expect, it } from 'vitest'
import {
  AI_PICKER_QUESTIONS,
  buildAiMovieQuery,
  recommendMovies,
  type AiPickerAnswers,
} from '@/utils/aiMoviePicker'
import type { Movie } from '@/services/tmdb/types'

const baseMovie: Movie = {
  adult: false,
  backdrop_path: null,
  genre_ids: [],
  id: 1,
  original_language: 'en',
  original_title: 'Test Movie',
  overview: '',
  popularity: 10,
  poster_path: null,
  release_date: '2024-01-01',
  title: 'Test Movie',
  video: false,
  vote_average: 7,
  vote_count: 500,
}

const answers: AiPickerAnswers = {
  mood: 'exciting',
  occasion: 'friends',
  pace: 'fast',
  era: 'recent',
}

describe('aiMoviePicker', () => {
  it('defines a four-step picker flow', () => {
    expect(AI_PICKER_QUESTIONS).toHaveLength(4)
    expect(AI_PICKER_QUESTIONS.map((question) => question.id)).toEqual([
      'mood',
      'occasion',
      'pace',
      'era',
    ])
  })

  it('keeps visible picker copy in i18n keys', () => {
    const firstQuestion = AI_PICKER_QUESTIONS[0]
    const firstOption = firstQuestion.options[0]

    expect(firstQuestion.titleKey).toBe('aiPicker.questions.mood.title')
    expect(firstQuestion.subtitleKey).toBe('aiPicker.questions.mood.subtitle')
    expect(firstOption.labelKey).toBe(
      'aiPicker.questions.mood.options.relaxed.label',
    )
    expect(firstOption.descriptionKey).toBe(
      'aiPicker.questions.mood.options.relaxed.description',
    )
    expect(firstOption.keywordKey).toBe(
      'aiPicker.questions.mood.options.relaxed.keyword',
    )
  })

  it('builds TMDB discover params from completed answers', () => {
    const params = buildAiMovieQuery(answers, 2026)

    expect(params.sort_by).toBe('popularity.desc')
    expect(params.with_genres).toBe('28|12|53|878|35')
    expect(params['primary_release_date.gte']).toBe('2021-01-01')
    expect(params['vote_count.gte']).toBe(300)
  })

  it('returns the top three movies with matched preference keywords', () => {
    const movies: Movie[] = [
      {
        ...baseMovie,
        id: 1,
        title: 'Action Crowd',
        genre_ids: [28, 12],
        popularity: 30,
        vote_average: 8.1,
        release_date: '2024-01-01',
      },
      {
        ...baseMovie,
        id: 2,
        title: 'Comedy Night',
        genre_ids: [35],
        popularity: 20,
        vote_average: 7.9,
        release_date: '2023-01-01',
      },
      {
        ...baseMovie,
        id: 3,
        title: 'Slow Drama',
        genre_ids: [18],
        popularity: 5,
        vote_average: 9,
        release_date: '1990-01-01',
      },
      {
        ...baseMovie,
        id: 4,
        title: 'Thrill Ride',
        genre_ids: [53],
        popularity: 25,
        vote_average: 7.2,
        release_date: '2022-01-01',
      },
    ]

    const recommendations = recommendMovies(movies, answers, 2026)

    expect(recommendations).toHaveLength(3)
    expect(recommendations.map((item) => item.movie.title)).toEqual([
      'Action Crowd',
      'Thrill Ride',
      'Comedy Night',
    ])
    expect(recommendations[0].matchedKeywordKeys).toEqual(
      expect.arrayContaining([
        'aiPicker.questions.mood.options.exciting.keyword',
        'aiPicker.questions.occasion.options.friends.keyword',
        'aiPicker.questions.pace.options.fast.keyword',
        'aiPicker.questions.era.options.recent.keyword',
      ]),
    )
  })
})
