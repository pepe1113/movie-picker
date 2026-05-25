import { describe, expect, it } from 'vitest'
import {
  buildAiDiscoverQuery,
  buildFilterDiscoverQuery,
} from '@/utils/pickerCriteria'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'
import type { FilterState } from '@/types/filter'

describe('picker criteria', () => {
  it('builds discover params from manual filter state', () => {
    const filter: FilterState = {
      genres: [28, 53],
      year: { from: 2020, to: 2026 },
      rating: { min: 7, max: 9 },
      sortBy: 'vote_average.desc',
    }

    expect(
      buildFilterDiscoverQuery(filter, { language: 'zh-TW', page: 2 }),
    ).toEqual({
      sort_by: 'vote_average.desc',
      with_genres: '28|53',
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2026-12-31',
      'vote_average.gte': 7,
      'vote_average.lte': 9,
      'vote_count.gte': 100,
      language: 'zh-TW',
      page: 2,
    })
  })

  it('builds discover params from AI picker answers', () => {
    const answers: AiPickerAnswers = {
      mood: 'exciting',
      occasion: 'friends',
      pace: 'fast',
      era: 'recent',
    }

    expect(
      buildAiDiscoverQuery(answers, {
        currentYear: 2026,
        language: 'en-US',
      }),
    ).toEqual({
      sort_by: 'popularity.desc',
      with_genres: '28|12|53|878|35',
      'vote_average.gte': 6.5,
      'vote_count.gte': 300,
      'primary_release_date.gte': '2021-01-01',
      language: 'en-US',
    })
  })
})
