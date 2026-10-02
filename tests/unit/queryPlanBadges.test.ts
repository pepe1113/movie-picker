import { describe, expect, it } from 'vitest'
import i18n from '@/i18n/config'
import { queryPlanBadges } from '@/components/features/ai-picker/queryPlanBadges'
import type { QueryPlanSnapshot } from '@/services/supabase/aiRecommendations'

const plan: QueryPlanSnapshot = {
  schema_version: 1,
  hard_constraints: {
    exclude_genres: [],
    exclude_keywords: [],
    runtime_min: null,
    runtime_max: null,
    release_year_min: null,
    release_year_max: null,
    original_language: null,
    origin_country: null,
  },
  soft_preferences: { include_genres: [], keywords: [], qualities: [] },
  people: [
    { id: 1, name: '甲', role: 'cast' },
    { id: 2, name: '乙', role: 'director' },
  ],
  people_match: 'any',
}

describe('query plan people badges', () => {
  it('shows whether multiple people match any or all', async () => {
    await i18n.changeLanguage('zh-TW')
    expect(queryPlanBadges(plan, i18n.t).map(({ text }) => text)).toEqual([
      '任一人物：甲（演員）、乙（導演）',
    ])
    expect(
      queryPlanBadges({ ...plan, people_match: 'all' }, i18n.t).map(
        ({ text }) => text,
      ),
    ).toEqual(['全部人物：甲（演員）、乙（導演）'])
  })
})
