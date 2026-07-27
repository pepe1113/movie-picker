import {
  buildDiscoverSearchParams,
  createPlanMessages,
  createRerankMessages,
  MAX_RECOMMENDATIONS,
  mergeCandidatePools,
  parseContextPlan,
  parseKeywordId,
  parseRankedRecommendations,
  parseTmdbMovies,
  parseToolArguments,
  PLAN_TOOL,
  RERANK_TOOL,
  type CandidateMovie,
  type ContextPlan,
  type RecommendationRequest,
} from './domain.ts'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export interface CoordinatorConfig {
  openrouterApiKey: string
  openrouterBaseUrl: string
  openrouterModel: string
  tmdbAccessToken: string
}

export class RecommendationStageError extends Error {
  stage: 'plan' | 'discover'

  constructor(
    stage: 'plan' | 'discover',
    options?: ErrorOptions,
  ) {
    super(`recommendation ${stage} failed`, options)
    this.stage = stage
  }
}

async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  failureMessage: string,
) {
  const response = await fetcher(url, init)
  if (!response.ok) throw new Error(failureMessage)
  return response.json() as Promise<unknown>
}

async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  tool: typeof PLAN_TOOL | typeof RERANK_TOOL,
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const data = await fetchJson(
    fetcher,
    `${config.openrouterBaseUrl}/chat/completions`,
    {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openrouterModel,
        messages,
        tools: [tool],
        tool_choice: {
          type: 'function',
          function: { name: tool.function.name },
        },
        temperature: tool.function.name === 'plan_movie_search' ? 0.2 : 0.3,
      }),
    },
    'AI model request failed',
  )

  return parseToolArguments(data, tool.function.name)
}

async function resolveKeywordIds(
  names: string[],
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const ids = await Promise.all(
    names.map(async (name) => {
      try {
        const params = new URLSearchParams({ query: name, page: '1' })
        const data = await fetchJson(
          fetcher,
          `${TMDB_BASE_URL}/search/keyword?${params}`,
          {
            signal,
            headers: {
              Authorization: `Bearer ${config.tmdbAccessToken}`,
              Accept: 'application/json',
            },
          },
          'TMDB keyword search failed',
        )
        return parseKeywordId(data)
      } catch (error) {
        if (signal.aborted) throw error
        return undefined
      }
    }),
  )

  return ids.filter((id): id is number => id !== undefined)
}

async function fetchDiscover(
  plan: ContextPlan['discover_plan'],
  keywordIds: number[],
  sortBy: 'popularity.desc' | 'vote_average.desc',
  locale: RecommendationRequest['locale'],
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
  relaxIncludes = false,
) {
  const params = buildDiscoverSearchParams(
    plan,
    keywordIds,
    sortBy,
    relaxIncludes,
  )
  params.set('language', locale === 'zh-TW' ? 'zh-TW' : 'en-US')
  const data = await fetchJson(
    fetcher,
    `${TMDB_BASE_URL}/discover/movie?${params}`,
    {
      signal,
      headers: {
        Authorization: `Bearer ${config.tmdbAccessToken}`,
        Accept: 'application/json',
      },
    },
    'TMDB Discover request failed',
  )
  return parseTmdbMovies(data)
}

export async function discoverCandidates(
  request: RecommendationRequest,
  plan: ContextPlan,
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const keywordIds = await resolveKeywordIds(
    plan.discover_plan.keyword_names,
    config,
    signal,
    fetcher,
  )
  let [popular, rated] = await Promise.all([
    fetchDiscover(
      plan.discover_plan,
      keywordIds,
      'popularity.desc',
      request.locale,
      config,
      signal,
      fetcher,
    ),
    fetchDiscover(
      plan.discover_plan,
      keywordIds,
      'vote_average.desc',
      request.locale,
      config,
      signal,
      fetcher,
    ),
  ])
  let candidates = mergeCandidatePools(popular, rated)

  if (
    candidates.length < 15 &&
    (plan.discover_plan.include_genre_ids.length > 0 || keywordIds.length > 0)
  ) {
    const [relaxedPopular, relaxedRated] = await Promise.all([
      fetchDiscover(
        plan.discover_plan,
        keywordIds,
        'popularity.desc',
        request.locale,
        config,
        signal,
        fetcher,
        true,
      ),
      fetchDiscover(
        plan.discover_plan,
        keywordIds,
        'vote_average.desc',
        request.locale,
        config,
        signal,
        fetcher,
        true,
      ),
    ])
    popular = mergeCandidatePools(popular, relaxedPopular)
    rated = mergeCandidatePools(rated, relaxedRated)
    candidates = mergeCandidatePools(popular, rated)
  }

  return {
    candidates,
    fallback: mergeCandidatePools(popular, rated, MAX_RECOMMENDATIONS),
  }
}

export function recommendationSnapshots(
  recommendations: Array<{
    movie_id: number
    reason?: string
    kind: 'primary' | 'wildcard'
  }>,
  candidates: CandidateMovie[],
) {
  const candidateById = new Map(candidates.map((movie) => [movie.id, movie]))
  return recommendations.flatMap((recommendation) => {
    const movie = candidateById.get(recommendation.movie_id)
    return movie ? [{ ...recommendation, movie_snapshot: movie }] : []
  })
}

export async function coordinateRecommendations(
  request: RecommendationRequest,
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let plan: ContextPlan
  try {
    plan = parseContextPlan(
      await callOpenRouter(
        createPlanMessages(request),
        PLAN_TOOL,
        config,
        signal,
        fetcher,
      ),
    )
  } catch (error) {
    throw new RecommendationStageError('plan', { cause: error })
  }

  let discovered: Awaited<ReturnType<typeof discoverCandidates>>
  try {
    discovered = await discoverCandidates(
      request,
      plan,
      config,
      signal,
      fetcher,
    )
  } catch (error) {
    throw new RecommendationStageError('discover', { cause: error })
  }

  let usedFallback = false
  let selected: Array<{
    movie_id: number
    reason?: string
    kind: 'primary' | 'wildcard'
  }> = []

  if (discovered.candidates.length > 0) {
    try {
      selected = parseRankedRecommendations(
        await callOpenRouter(
          createRerankMessages(request, plan, discovered.candidates),
          RERANK_TOOL,
          config,
          signal,
          fetcher,
        ),
        discovered.candidates,
        request.locale,
      )
    } catch (error) {
      console.error('recommendation reranking failed; using fallback', error)
      usedFallback = true
      selected = discovered.fallback.map((movie) => ({
        movie_id: movie.id,
        kind: 'primary' as const,
      }))
    }
  }

  return {
    plan,
    candidates: discovered.candidates,
    recommendations: recommendationSnapshots(selected, discovered.candidates),
    model: config.openrouterModel,
    usedFallback,
  }
}
