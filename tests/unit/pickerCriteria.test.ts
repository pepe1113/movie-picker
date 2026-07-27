import { describe, expect, it } from 'vitest'
import { buildAiDiscoverQuery } from '@/utils/pickerCriteria'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'

describe('picker criteria', () => {
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
