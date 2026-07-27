import type { DiscoverMovieParams } from '@/services/tmdb/types'

export type AiPickerQuestionId = 'mood' | 'occasion' | 'pace' | 'era'

export type AiPickerAnswers = Record<AiPickerQuestionId, string>

export interface AiPickerOption {
  value: string
  labelKey: string
  descriptionKey: string
  genreIds?: number[]
  keywordKey: string
}

export interface AiPickerQuestion {
  id: AiPickerQuestionId
  titleKey: string
  subtitleKey: string
  options: AiPickerOption[]
}

export interface AiPickerPreferenceMeta {
  emoji: string
  labelKey: string
}

interface QueryOptions {
  currentYear?: number
  language?: string
  page?: number
}

const GENRES = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  sciFi: 878,
  thriller: 53,
} as const

const AI_PICKER_OPTION_EMOJI: Record<
  AiPickerQuestionId,
  Record<string, string>
> = {
  mood: {
    relaxed: '😌',
    exciting: '⚡',
    moving: '🥹',
    mindBending: '🧠',
  },
  occasion: {
    solo: '🛋️',
    date: '🍷',
    friends: '🍿',
    family: '🏠',
  },
  pace: {
    fast: '🚀',
    immersive: '🌌',
    any: '🎲',
  },
  era: {
    recent: '🆕',
    classic: '🎞️',
    any: '♾️',
  },
}

export const AI_PICKER_QUESTIONS: AiPickerQuestion[] = [
  {
    id: 'mood',
    titleKey: 'aiPicker.questions.mood.title',
    subtitleKey: 'aiPicker.questions.mood.subtitle',
    options: [
      {
        value: 'relaxed',
        labelKey: 'aiPicker.questions.mood.options.relaxed.label',
        descriptionKey: 'aiPicker.questions.mood.options.relaxed.description',
        genreIds: [
          GENRES.comedy,
          GENRES.animation,
          GENRES.family,
          GENRES.music,
        ],
        keywordKey: 'aiPicker.questions.mood.options.relaxed.keyword',
      },
      {
        value: 'exciting',
        labelKey: 'aiPicker.questions.mood.options.exciting.label',
        descriptionKey: 'aiPicker.questions.mood.options.exciting.description',
        genreIds: [
          GENRES.action,
          GENRES.adventure,
          GENRES.thriller,
          GENRES.sciFi,
        ],
        keywordKey: 'aiPicker.questions.mood.options.exciting.keyword',
      },
      {
        value: 'moving',
        labelKey: 'aiPicker.questions.mood.options.moving.label',
        descriptionKey: 'aiPicker.questions.mood.options.moving.description',
        genreIds: [GENRES.drama, GENRES.romance, GENRES.history],
        keywordKey: 'aiPicker.questions.mood.options.moving.keyword',
      },
      {
        value: 'mindBending',
        labelKey: 'aiPicker.questions.mood.options.mindBending.label',
        descriptionKey:
          'aiPicker.questions.mood.options.mindBending.description',
        genreIds: [
          GENRES.mystery,
          GENRES.sciFi,
          GENRES.thriller,
          GENRES.fantasy,
        ],
        keywordKey: 'aiPicker.questions.mood.options.mindBending.keyword',
      },
    ],
  },
  {
    id: 'occasion',
    titleKey: 'aiPicker.questions.occasion.title',
    subtitleKey: 'aiPicker.questions.occasion.subtitle',
    options: [
      {
        value: 'solo',
        labelKey: 'aiPicker.questions.occasion.options.solo.label',
        descriptionKey: 'aiPicker.questions.occasion.options.solo.description',
        genreIds: [GENRES.drama, GENRES.mystery, GENRES.sciFi],
        keywordKey: 'aiPicker.questions.occasion.options.solo.keyword',
      },
      {
        value: 'date',
        labelKey: 'aiPicker.questions.occasion.options.date.label',
        descriptionKey: 'aiPicker.questions.occasion.options.date.description',
        genreIds: [GENRES.romance, GENRES.comedy, GENRES.drama],
        keywordKey: 'aiPicker.questions.occasion.options.date.keyword',
      },
      {
        value: 'friends',
        labelKey: 'aiPicker.questions.occasion.options.friends.label',
        descriptionKey:
          'aiPicker.questions.occasion.options.friends.description',
        genreIds: [GENRES.action, GENRES.adventure, GENRES.comedy],
        keywordKey: 'aiPicker.questions.occasion.options.friends.keyword',
      },
      {
        value: 'family',
        labelKey: 'aiPicker.questions.occasion.options.family.label',
        descriptionKey:
          'aiPicker.questions.occasion.options.family.description',
        genreIds: [
          GENRES.family,
          GENRES.animation,
          GENRES.adventure,
          GENRES.comedy,
        ],
        keywordKey: 'aiPicker.questions.occasion.options.family.keyword',
      },
    ],
  },
  {
    id: 'pace',
    titleKey: 'aiPicker.questions.pace.title',
    subtitleKey: 'aiPicker.questions.pace.subtitle',
    options: [
      {
        value: 'fast',
        labelKey: 'aiPicker.questions.pace.options.fast.label',
        descriptionKey: 'aiPicker.questions.pace.options.fast.description',
        keywordKey: 'aiPicker.questions.pace.options.fast.keyword',
      },
      {
        value: 'immersive',
        labelKey: 'aiPicker.questions.pace.options.immersive.label',
        descriptionKey: 'aiPicker.questions.pace.options.immersive.description',
        keywordKey: 'aiPicker.questions.pace.options.immersive.keyword',
      },
      {
        value: 'any',
        labelKey: 'aiPicker.questions.pace.options.any.label',
        descriptionKey: 'aiPicker.questions.pace.options.any.description',
        keywordKey: 'aiPicker.questions.pace.options.any.keyword',
      },
    ],
  },
  {
    id: 'era',
    titleKey: 'aiPicker.questions.era.title',
    subtitleKey: 'aiPicker.questions.era.subtitle',
    options: [
      {
        value: 'recent',
        labelKey: 'aiPicker.questions.era.options.recent.label',
        descriptionKey: 'aiPicker.questions.era.options.recent.description',
        keywordKey: 'aiPicker.questions.era.options.recent.keyword',
      },
      {
        value: 'classic',
        labelKey: 'aiPicker.questions.era.options.classic.label',
        descriptionKey: 'aiPicker.questions.era.options.classic.description',
        keywordKey: 'aiPicker.questions.era.options.classic.keyword',
      },
      {
        value: 'any',
        labelKey: 'aiPicker.questions.era.options.any.label',
        descriptionKey: 'aiPicker.questions.era.options.any.description',
        keywordKey: 'aiPicker.questions.era.options.any.keyword',
      },
    ],
  },
]

export function getAiPickerOption(
  questionId: AiPickerQuestionId,
  value: string,
) {
  return AI_PICKER_QUESTIONS.find(
    (question) => question.id === questionId,
  )?.options.find((option) => option.value === value)
}

export function getAiPickerPreferenceMeta(
  questionId: AiPickerQuestionId,
  value: string,
): AiPickerPreferenceMeta | null {
  const option = getAiPickerOption(questionId, value)

  if (!option) return null

  return {
    emoji: AI_PICKER_OPTION_EMOJI[questionId][value] ?? '✨',
    labelKey: option.labelKey,
  }
}

export function getAiPickerKeywordPreferenceMeta(
  keywordKey: string,
): AiPickerPreferenceMeta | null {
  for (const question of AI_PICKER_QUESTIONS) {
    const option = question.options.find(
      (candidate) => candidate.keywordKey === keywordKey,
    )

    if (option) {
      return getAiPickerPreferenceMeta(question.id, option.value)
    }
  }

  return null
}

export function getAiPickerKeywordKeys(answers: Partial<AiPickerAnswers>) {
  return AI_PICKER_QUESTIONS.flatMap((question) => {
    const value = answers[question.id]
    const option = value ? getAiPickerOption(question.id, value) : undefined
    return option ? [option.keywordKey] : []
  })
}

export function buildAiDiscoverQuery(
  answers: AiPickerAnswers,
  options: QueryOptions = {},
): DiscoverMovieParams {
  const currentYear = options.currentYear ?? new Date().getFullYear()
  const genreIds = getSelectedGenreIds(answers)
  const params: DiscoverMovieParams = {
    sort_by: getSortBy(answers),
    with_genres: genreIds.join('|'),
    'vote_average.gte': answers.era === 'classic' ? 7.2 : 6.5,
    'vote_count.gte': getVoteCountFloor(answers),
  }

  if (answers.era === 'recent') {
    params['primary_release_date.gte'] = `${currentYear - 5}-01-01`
  }

  if (answers.era === 'classic') {
    params['primary_release_date.lte'] = `${currentYear - 10}-12-31`
  }

  return withQueryOptions(params, options)
}

export function getSelectedGenreIds(answers: AiPickerAnswers) {
  const ids = new Set<number>()

  AI_PICKER_QUESTIONS.forEach((question) => {
    const option = getAiPickerOption(question.id, answers[question.id])
    option?.genreIds?.forEach((id) => ids.add(id))
  })

  return [...ids]
}

function withQueryOptions(
  params: DiscoverMovieParams,
  options: QueryOptions,
): DiscoverMovieParams {
  return {
    ...params,
    ...(options.language ? { language: options.language } : {}),
    ...(options.page ? { page: options.page } : {}),
  }
}

function getSortBy(answers: AiPickerAnswers) {
  if (answers.pace === 'immersive' || answers.era === 'classic') {
    return 'vote_average.desc'
  }

  return 'popularity.desc'
}

function getVoteCountFloor(answers: AiPickerAnswers) {
  if (answers.pace === 'fast') return 300
  if (answers.era === 'classic') return 500
  return 200
}
