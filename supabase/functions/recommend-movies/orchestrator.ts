import {
  MAX_RECOMMENDATIONS,
  parseContextPlan,
  type ContextPlan,
  type RecommendationRequest,
} from './domain.ts'
import {
  discoverCandidates,
  RecommendationConditionError,
  type DiscoveryConfig,
} from './discovery.ts'
import {
  requestRecommendationPlan,
  type OpenAIUsage,
  type PlanningConfig,
} from './planning.ts'
import { applyDeterministicMediaRules, isGeneralExploration } from './rules.ts'
import type { CandidateMedia } from './tmdb.ts'

export { RecommendationConditionError } from './discovery.ts'
export type { RecommendationConditionCode } from './discovery.ts'
export type { OpenAIUsage } from './planning.ts'

export interface CoordinatorConfig extends PlanningConfig, DiscoveryConfig {}

export class RecommendationStageError extends Error {
  stage: 'plan' | 'discover'

  constructor(stage: 'plan' | 'discover', options?: ErrorOptions) {
    super(`recommendation ${stage} failed`, options)
    this.stage = stage
  }
}

export function recommendationSnapshots(candidates: CandidateMedia[]) {
  return candidates.slice(0, MAX_RECOMMENDATIONS).map((media) => ({
    media_id: media.id,
    kind: 'primary' as const,
    media_snapshot: media,
  }))
}

export async function coordinateRecommendations(
  request: RecommendationRequest,
  config: CoordinatorConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let plan: ContextPlan
  let usage: OpenAIUsage | undefined
  try {
    const planned = await requestRecommendationPlan(
      request,
      config,
      signal,
      fetcher,
    )
    usage = planned.usage
    plan = applyDeterministicMediaRules(
      request,
      parseContextPlan(planned.plan, request.media_type),
    )
  } catch (error) {
    throw new RecommendationStageError('plan', { cause: error })
  }

  if (isGeneralExploration(plan)) {
    plan = {
      ...plan,
      intent_summary:
        request.locale === 'zh-TW'
          ? request.media_type === 'movie'
            ? '一般電影探索'
            : '一般劇集探索'
          : request.media_type === 'movie'
            ? 'General movie exploration'
            : 'General TV exploration',
      display_labels: { hard: [], soft: [] },
    }
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
    if (error instanceof RecommendationConditionError) throw error
    throw new RecommendationStageError('discover', { cause: error })
  }

  return {
    plan,
    candidates: discovered.candidates,
    resolvedPeople: discovered.resolvedPeople,
    resolvedKeywords: discovered.resolvedKeywords,
    recommendations: recommendationSnapshots(discovered.candidates),
    model: config.openaiModel,
    usage,
    usedFallback: discovered.usedFallback,
  }
}
