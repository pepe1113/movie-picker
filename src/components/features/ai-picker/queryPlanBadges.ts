import type { QueryPlanSnapshot } from '@/services/supabase/aiRecommendationContract'

function displayGenre(name: string) {
  return name.replaceAll('_', ' ')
}

export function queryPlanBadges(
  plan: QueryPlanSnapshot,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const hard = plan.hard_constraints
  const badges: Array<{ text: string; kind: 'hard' | 'soft' }> = [
    ...hard.exclude_genres.map((name) => ({
      text: t('aiPicker.criteria.excludeGenre', {
        value: displayGenre(name),
      }),
      kind: 'hard' as const,
    })),
    ...hard.exclude_keywords.map(({ display_label }) => ({
      text: t('aiPicker.criteria.exclude', { value: display_label }),
      kind: 'hard' as const,
    })),
  ]

  if (hard.runtime_min !== null || hard.runtime_max !== null) {
    const key =
      hard.runtime_min !== null && hard.runtime_max !== null
        ? 'runtimeBetween'
        : hard.runtime_min !== null
          ? 'runtimeMin'
          : 'runtimeMax'
    badges.push({
      text: t(`aiPicker.criteria.${key}`, {
        min: hard.runtime_min,
        max: hard.runtime_max,
      }),
      kind: 'hard',
    })
  }
  if (hard.release_year_min !== null || hard.release_year_max !== null) {
    const key =
      hard.release_year_min !== null && hard.release_year_max !== null
        ? 'yearBetween'
        : hard.release_year_min !== null
          ? 'yearMin'
          : 'yearMax'
    badges.push({
      text: t(`aiPicker.criteria.${key}`, {
        min: hard.release_year_min,
        max: hard.release_year_max,
      }),
      kind: 'hard',
    })
  }
  if (hard.original_language) {
    badges.push({
      text: t('aiPicker.criteria.language', {
        value: hard.original_language,
      }),
      kind: 'hard',
    })
  }
  if (hard.origin_country) {
    badges.push({
      text: t('aiPicker.criteria.country', { value: hard.origin_country }),
      kind: 'hard',
    })
  }

  badges.push(
    ...plan.soft_preferences.include_genres.map(({ name }) => ({
      text: t('aiPicker.criteria.genre', { value: displayGenre(name) }),
      kind: 'soft' as const,
    })),
    ...plan.soft_preferences.keywords.map(({ display_label }) => ({
      text: display_label,
      kind: 'soft' as const,
    })),
    ...plan.soft_preferences.qualities.map((text) => ({
      text,
      kind: 'soft' as const,
    })),
  )

  if (plan.people.length > 0) {
    const people = plan.people.map(({ name, role }) =>
      t('aiPicker.criteria.person', {
        name,
        role: t(`aiPicker.criteria.roles.${role}`),
      }),
    )
    badges.push({
      text:
        people.length === 1
          ? people[0]
          : t(
              `aiPicker.criteria.people${plan.people_match === 'any' ? 'Any' : 'All'}`,
              {
                people: people.join(t('aiPicker.criteria.peopleSeparator')),
              },
            ),
      kind: 'hard',
    })
  }

  return badges.filter(
    (badge, index) =>
      badges.findIndex(
        (candidate) =>
          candidate.kind === badge.kind && candidate.text === badge.text,
      ) === index,
  )
}
