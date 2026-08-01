import type {
  ContextPlan,
  MediaType,
  ResolvedKeyword,
  ResolvedPerson,
} from './domain.ts'
import type { recommendationSnapshots } from './orchestrator.ts'

export function createHistoryRecord(
  userId: string,
  mediaType: MediaType,
  plan: ContextPlan,
  candidateIds: number[],
  recommendations: ReturnType<typeof recommendationSnapshots>,
  resolvedPeople: ResolvedPerson[],
  resolvedKeywords: ResolvedKeyword[],
  model: string,
) {
  return {
    user_id: userId,
    media_type: mediaType,
    intent: {
      summary: plan.intent_summary,
      hard_constraints: plan.hard_constraints,
      soft_preferences: plan.soft_preferences,
      people: resolvedPeople,
      keywords: resolvedKeywords,
      display_labels: plan.display_labels,
    },
    discover_plan: {
      ...plan.discover_plan,
      people_match: plan.people_match,
    },
    candidate_media_ids: candidateIds,
    recommendations,
    provider: 'openai',
    model,
  }
}

export function saveHistoryInBackground(
  waitUntil: (task: Promise<unknown>) => void,
  insert: () => Promise<void>,
  onError: (error: unknown) => void = (error) =>
    console.error('recommendation history background insert failed', error),
) {
  waitUntil(insert().catch(onError))
}
