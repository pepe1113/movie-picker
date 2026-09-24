import {
  TMDB_TV_GENRES,
  type ConditionSource,
  type ContextPlan,
  type RecommendationRequest,
  type SoftPreferences,
} from './domain.ts'

function addUniqueGenre(
  genres: SoftPreferences['include_genres'],
  id: number,
  source: ConditionSource,
) {
  return genres.some((genre) => genre.id === id)
    ? genres
    : [...genres, { id, source }].slice(0, 3)
}

export function applyDeterministicMediaRules(
  request: RecommendationRequest,
  originalPlan: ContextPlan,
): ContextPlan {
  let plan = originalPlan
  if (
    request.locale === 'zh-TW' &&
    /[\u3040-\u30ff]/u.test(plan.intent_summary)
  ) {
    plan = {
      ...plan,
      intent_summary:
        request.media_type === 'movie'
          ? '符合條件的電影推薦'
          : '符合條件的劇集推薦',
    }
  }
  if (
    request.media_type === 'movie' &&
    /恐怖|ホラー|horror/iu.test(request.request) &&
    plan.hard_constraints.exclude_genre_ids.length === 1 &&
    plan.hard_constraints.exclude_genre_ids[0] === 27 &&
    plan.hard_constraints.exclude_keywords.length === 0 &&
    plan.hard_constraints.runtime_min === undefined &&
    plan.hard_constraints.runtime_max === undefined &&
    plan.hard_constraints.release_year_min === undefined &&
    plan.hard_constraints.release_year_max === undefined &&
    plan.hard_constraints.original_language === undefined &&
    plan.hard_constraints.origin_country === undefined
  ) {
    plan = {
      ...plan,
      display_labels: {
        ...plan.display_labels,
        hard: [request.locale === 'zh-TW' ? '排除恐怖片' : 'No horror'],
      },
    }
  }

  if (request.media_type === 'movie') {
    const isShortMovie =
      /短一點(?:的)?電影|篇幅短(?:一點)?(?:的)?電影|shorter? movie/iu.test(
        request.request,
      )
    if (!isShortMovie) return plan

    const excludeGenreIds =
      /不要|不看|避(?:開|免)|排除|除外|without|avoid|\bno\b/iu.test(
        request.request,
      )
        ? plan.hard_constraints.exclude_genre_ids
        : []
    const hardConstraints = {
      ...plan.hard_constraints,
      exclude_genre_ids: excludeGenreIds,
      runtime_min: 60,
      runtime_max: 90,
    }
    return {
      ...plan,
      hard_constraints: hardConstraints,
      display_labels: {
        ...plan.display_labels,
        hard: [
          ...(excludeGenreIds.length ||
          plan.hard_constraints.exclude_keywords.length ||
          plan.hard_constraints.release_year_min ||
          plan.hard_constraints.release_year_max ||
          plan.hard_constraints.original_language ||
          plan.hard_constraints.origin_country
            ? plan.display_labels.hard.filter(
                (label) => !/分鐘|minutes?|短電影|short movie/iu.test(label),
              )
            : []),
          request.locale === 'zh-TW' ? '60–90 分鐘' : '60–90 minutes',
        ].slice(0, 6),
      },
      discover_plan: {
        ...plan.discover_plan,
        exclude_genre_ids: excludeGenreIds,
        runtime_min: 60,
        runtime_max: 90,
      },
    }
  }

  const isJapaneseAnimation =
    /日本(?:的)?動畫|日本アニメ|japanese anime/iu.test(request.request)
  const isJapaneseDrama =
    /日劇|日本(?:的)?(?:真人)?(?:劇集|影集|電視劇)|japanese drama/iu.test(
      request.request,
    )
  const isLight = /輕鬆|放鬆|light(?:hearted)?|easygoing/iu.test(
    request.request,
  )
  const isThriller = /\bthriller\b/iu.test(request.request)
  const excludesHorror =
    /(?:\bno\b|without|avoid)\s+(?:any\s+)?horror|horror\s+(?:is\s+)?(?:excluded|avoided)/iu.test(
      request.request,
    )
  if (isThriller || excludesHorror) {
    const namedGenreIds = new Set<number>(
      Object.entries(TMDB_TV_GENRES)
        .filter(([name]) =>
          new RegExp(`\\b${name.replaceAll('_', '[ -]')}\\b`, 'iu').test(
            request.request,
          ),
        )
        .map(([, id]) => id),
    )
    const includeGenres = isThriller
      ? plan.soft_preferences.include_genres.filter((genre) =>
          namedGenreIds.has(genre.id),
        )
      : plan.soft_preferences.include_genres
    const keywords =
      isThriller &&
      !plan.soft_preferences.keywords.some((keyword) =>
        /thrill|suspense/iu.test(keyword.lookup_name),
      )
        ? [
            ...plan.soft_preferences.keywords,
            {
              lookup_name: 'thriller',
              display_label: 'Thriller',
              source: 'explicit' as const,
            },
          ].slice(0, 2)
        : plan.soft_preferences.keywords
    const excludeGenreIds = excludesHorror
      ? plan.hard_constraints.exclude_genre_ids.filter((id) =>
          namedGenreIds.has(id),
        )
      : plan.hard_constraints.exclude_genre_ids
    const excludeKeywords =
      excludesHorror &&
      !plan.hard_constraints.exclude_keywords.some((keyword) =>
        /horror/iu.test(keyword.lookup_name),
      )
        ? [
            ...plan.hard_constraints.exclude_keywords,
            { lookup_name: 'horror', display_label: 'No horror' },
          ].slice(0, 2)
        : plan.hard_constraints.exclude_keywords
    plan = {
      ...plan,
      hard_constraints: {
        ...plan.hard_constraints,
        exclude_genre_ids: excludeGenreIds,
        exclude_keywords: excludeKeywords,
      },
      soft_preferences: {
        ...plan.soft_preferences,
        include_genres: includeGenres,
        keywords,
      },
      display_labels: {
        hard: [
          ...plan.display_labels.hard.filter(
            (label) => !/thrill|series|影集|劇集/iu.test(label),
          ),
          ...(excludesHorror
            ? [request.locale === 'zh-TW' ? '排除恐怖' : 'No horror']
            : []),
        ].slice(0, 6),
        soft: [
          ...plan.display_labels.soft,
          ...(isThriller
            ? [request.locale === 'zh-TW' ? '驚悚' : 'Thriller']
            : []),
        ].slice(0, 4),
      },
      discover_plan: {
        ...plan.discover_plan,
        include_genres: includeGenres,
        exclude_genre_ids: excludeGenreIds,
        exclude_keywords: excludeKeywords,
        keywords,
      },
    }
  }
  if (!isJapaneseDrama && !isJapaneseAnimation) return plan

  const excludeGenreIds = plan.hard_constraints.exclude_genre_ids.filter(
    (id) => id !== 16 || !isJapaneseAnimation,
  )
  if (
    isJapaneseDrama &&
    !isJapaneseAnimation &&
    !excludeGenreIds.includes(16)
  ) {
    excludeGenreIds.push(16)
  }
  let includeGenres = plan.soft_preferences.include_genres.filter(
    (genre) => genre.id !== 16 || isJapaneseAnimation,
  )
  if (isJapaneseAnimation)
    includeGenres = addUniqueGenre(includeGenres, 16, 'explicit')
  if (isLight) includeGenres = addUniqueGenre(includeGenres, 35, 'explicit')

  const hardConstraints = {
    ...plan.hard_constraints,
    exclude_genre_ids: excludeGenreIds,
    original_language: 'ja',
    origin_country: 'JP',
  }
  const softPreferences = {
    ...plan.soft_preferences,
    include_genres: includeGenres,
  }

  return {
    ...plan,
    hard_constraints: hardConstraints,
    soft_preferences: softPreferences,
    display_labels: {
      hard: [
        ...plan.display_labels.hard.filter(
          (label) => !/輕鬆|放鬆|幽默|愉快|light|easygoing/iu.test(label),
        ),
        ...(isJapaneseDrama && !isJapaneseAnimation
          ? [
              request.locale === 'zh-TW'
                ? '日本真人影集'
                : 'Japanese live action',
            ]
          : []),
        ...(excludeGenreIds.includes(16)
          ? [request.locale === 'zh-TW' ? '排除動畫' : 'No animation']
          : []),
      ].slice(0, 6),
      soft:
        isLight &&
        !plan.display_labels.soft.includes(
          request.locale === 'zh-TW' ? '輕鬆' : 'Light',
        )
          ? [
              ...plan.display_labels.soft,
              request.locale === 'zh-TW' ? '輕鬆' : 'Light',
            ].slice(0, 4)
          : plan.display_labels.soft,
    },
    discover_plan: {
      ...plan.discover_plan,
      include_genres: includeGenres,
      exclude_genre_ids: excludeGenreIds,
      original_language: 'ja',
      origin_country: 'JP',
    },
  }
}

export function hasInferredPreferences(plan: ContextPlan) {
  return (
    plan.discover_plan.include_genres.some(
      (genre) => genre.source === 'inferred',
    ) ||
    plan.discover_plan.keywords.some((keyword) => keyword.source === 'inferred')
  )
}

export function isGeneralExploration(plan: ContextPlan) {
  const hard = plan.hard_constraints
  return (
    plan.people.length === 0 &&
    plan.soft_preferences.include_genres.length === 0 &&
    plan.soft_preferences.keywords.length === 0 &&
    hard.exclude_genre_ids.length === 0 &&
    hard.exclude_keywords.length === 0 &&
    hard.runtime_min === undefined &&
    hard.runtime_max === undefined &&
    hard.release_year_min === undefined &&
    hard.release_year_max === undefined &&
    hard.original_language === undefined &&
    hard.origin_country === undefined
  )
}
